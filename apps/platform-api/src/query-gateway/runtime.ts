import type { TestAppAccessPort, TestAppContext } from '../studio/access.js';
import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyRequest, HTTPMethods } from 'fastify';
import { SignatureVerifier, signedHeaders } from '@eas/connector-transport';
import type { components } from '@eas/api-contract';
import type { Database, Sql } from '../infrastructure/database.js';
import { Mutations } from '../infrastructure/mutations.js';
import { Fault } from '../infrastructure/errors.js';
import type { Identity, Subject, Actor } from '../identity/identity.js';
import type { QueryCatalogPort } from '../catalog/query-port.js';
import type { WorkerTarget } from '../infrastructure/worker-target.js';
import type { contractValidation } from '../infrastructure/contract-validation.js';
import { QueryGateway, jobDto, type Purpose } from './service.js';
import { GatewayJobs } from './jobs.js';
import type { RuntimeQueryContext } from '../releases/query-access.js';
type S = components['schemas'];
type Context = {
  tx: Sql;
  subject: Subject;
  req: FastifyRequest;
  params: Record<string, string>;
  traceId: string;
};
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function createQueryRuntime(
  db: Database,
  identity: Identity,
  catalog: QueryCatalogPort,
  workers: Partial<Record<'test' | 'production', WorkerTarget>>,
  cursorKey: string,
  contract: Awaited<ReturnType<typeof contractValidation>>,
  log: (record: Record<string, unknown>) => void,
  appAccess: TestAppAccessPort,
) {
  const gateway = new QueryGateway(identity, catalog, cursorKey, appAccess),
    jobs = new GatewayJobs(db, identity, gateway, workers, contract.validate),
    mutations = new Mutations(db, identity),
    verifier = new SignatureVerifier();
  const prepare = async (c: Context, runtimeKind?: 'app' | 'report') => {
    if (!runtimeKind)
      return { query: (c.req.body as S['CreateTestQuery']).query, runtime: undefined };
    const runtime: RuntimeQueryContext = {
      kind: runtimeKind,
      resourceId: c.params[runtimeKind + 'Id'] ?? '',
    };
    return runtimeKind === 'report'
      ? gateway.releases
          .reportQuery(c.tx, c.subject, runtime, c.req.body as S['CreateReportQuery'])
          .then((v) => ({ query: v.query, runtime: v.context }))
      : { query: (c.req.body as S['CreateRuntimeQuery']).query, runtime };
  };
  function register(
    fastify: FastifyInstance,
    method: HTTPMethods,
    path: string,
    permission: string,
    human: boolean,
    fn: (c: Context) => Promise<unknown>,
    mode: 'read' | 'mutate' | 'validate' = 'read',
    revalidate?: (c: Context) => Promise<void>,
  ) {
    const operation = contract.spec.paths[path]?.[method.toLowerCase()];
    if (!operation) throw new Error('MISSING_QUERY_CONTRACT');
    fastify.route({
      method,
      url: '/v1' + path.replaceAll(/\{(\w+)\}/g, ':$1'),
      handler: async (req, reply) => {
        const traceId = randomUUID(),
          started = Date.now();
        let actor: Actor | undefined, org: string | undefined;
        reply.header('X-Trace-Id', traceId).header('Cache-Control', 'no-store');
        try {
          actor = await identity.authenticate(req);
          const header = req.headers['x-organization-id'];
          if (typeof header !== 'string' || !uuid.test(header))
            throw new Fault(400, 'VALIDATION_ERROR');
          org = header;
          const params = req.params as Record<string, string>;
          if (
            Object.values(params).some((p) => !uuid.test(p)) ||
            (params['orgId'] && params['orgId'] !== org) ||
            Object.keys(req.query as object).length
          )
            throw new Fault(400, 'VALIDATION_ERROR');
          contract.body(operation, req.body);
          const currentActor = actor,
            organizationId = org;
          const invoke = (tx: Sql, subject: Subject) => fn({ tx, subject, req, params, traceId });
          let result: unknown;
          if (mode === 'mutate') {
            const response = await mutations.run(
              req,
              actor,
              org,
              operation.operationId,
              permission,
              human,
              async (tx, subject) => ({
                body: await invoke(tx, subject),
                status:
                  path.endsWith('/cancel') ||
                  path.endsWith('/query-policies') ||
                  path.endsWith('/data-scope')
                    ? 200
                    : 202,
              }),
              revalidate
                ? async (tx, subject) => revalidate({ tx, subject, req, params, traceId })
                : undefined,
            );
            result = response.body;
            reply.code(response.status ?? 200);
            if (path.endsWith('/cancel')) {
              const dto = result as S['QueryJob'];
              void jobs.signalCancel(organizationId, dto.id, dto.environment);
            }
          } else
            result = await db.tenant(org, async (tx) => {
              await tx.one('SELECT id FROM organizations WHERE id=$1 FOR UPDATE', [organizationId]);
              const subject = await identity.subject(tx, currentActor, organizationId);
              identity.require(subject, permission, human);
              if (
                mode === 'validate' &&
                (typeof req.headers['idempotency-key'] !== 'string' ||
                  !uuid.test(req.headers['idempotency-key']))
              )
                throw new Fault(400, 'VALIDATION_ERROR');
              const result = await invoke(tx, subject);
              if (mode === 'validate') {
                const q = (req.body as { query?: S['QuerySpec'] }).query;
                await gateway.audit(tx, subject, {
                  ...(q?.datasetId ? { datasetId: q.datasetId } : {}),
                  environment: path.startsWith('/runtime/') ? 'production' : 'test',
                  durationMs: Date.now() - started,
                  rowCount: 0,
                  status: 'validated',
                  allowed: true,
                  traceId,
                });
              }
              return result;
            });
          log({
            event: 'gateway.request',
            operation: operation.operationId,
            status: reply.statusCode,
            traceId,
          });
          if (path.endsWith('/export')) {
            const csv = result as { csv: string; truncated: boolean };
            return reply
              .header('Content-Type', 'text/csv; charset=utf-8')
              .header('Content-Disposition', 'attachment; filename="query-export.csv"')
              .header('X-Result-Truncated', String(csv.truncated))
              .send(csv.csv);
          }
          return reply.send(result);
        } catch (error) {
          const fault = error instanceof Fault ? error : new Fault(503, 'DEPENDENCY_UNAVAILABLE');
          const query = (req.body as { query?: { datasetId?: unknown } } | undefined)?.query,
            datasetId =
              typeof query?.datasetId === 'string' && uuid.test(query.datasetId)
                ? query.datasetId
                : undefined;
          if (actor && org)
            await db
              .tenant(org, (tx) =>
                gateway.audit(
                  tx,
                  { ...actor!, organizationId: org!, actions: new Set() },
                  {
                    ...(datasetId ? { datasetId } : {}),
                    ...(path.startsWith('/runtime/')
                      ? {
                          runtime: {
                            kind: path.includes('/reports/') ? 'report' : 'app',
                            resourceId:
                              (req.params as Record<string, string>)['reportId'] ??
                              (req.params as Record<string, string>)['appId'] ??
                              '',
                          } as RuntimeQueryContext,
                        }
                      : {}),
                    environment: path.startsWith('/runtime/') ? 'production' : 'test',
                    durationMs: Date.now() - started,
                    rowCount: 0,
                    status: fault.code,
                    allowed: false,
                    traceId,
                  },
                ),
              )
              .catch(() => {});
          log({
            event: 'gateway.request',
            operation: operation.operationId,
            status: fault.status,
            code: fault.code,
            traceId,
          });
          return reply.code(fault.status).send({
            error: {
              code: fault.code,
              message: fault.safeMessage,
              ...(fault.details.length ? { details: fault.details } : {}),
              requestId: req.id,
            },
            traceId,
          });
        }
      },
    });
  }
  async function inspectDataset(tx: Sql, s: Subject, ref: S['DatasetRef']) {
    const access = await identity.allowed(tx, s, ref.datasetId, 'dataset.read');
    const { version } = await catalog.queryDataset(
      tx,
      s.organizationId,
      ref.datasetId,
      ref.datasetVersionId,
    );
    const fields = version.fields.filter(
        (field) => access === null || access.fieldKeys.includes(field.key),
      ),
      fieldKeys = fields.map((field) => field.key);
    const metricKeys = version.metrics
      .filter(
        (metric) =>
          (access === null || access.metricKeys.includes(metric.key)) &&
          fieldKeys.includes(metric.fieldKey) &&
          metric.filters.every((filter) => fieldKeys.includes(filter.fieldKey)),
      )
      .map((metric) => metric.key);
    return { fieldKeys, metricKeys };
  }
  async function registerRoutes(fastify: FastifyInstance) {
    for (const [prefix, kind] of [
      ['/queries/test', undefined],
      ['/runtime/apps/{appId}/queries', 'app'],
      ['/runtime/reports/{reportId}/queries', 'report'],
    ] as const) {
      const permission = kind ? 'dataset.query.production' : 'dataset.query.test';
      register(
        fastify,
        'POST',
        prefix,
        permission,
        false,
        async (c) => {
          const { query, runtime } = await prepare(c, kind);
          return gateway.create(c.tx, c.subject, query, 'query', c.traceId, runtime);
        },
        'mutate',
        async (c) => {
          const { query, runtime } = await prepare(c, kind);
          await gateway.authorize(c.tx, c.subject, query, 'query', runtime);
        },
      );
      register(
        fastify,
        'POST',
        prefix + '/validate',
        permission,
        false,
        async (c) => {
          const { query, runtime } = await prepare(c, kind);
          return gateway.validation(
            await gateway.authorize(c.tx, c.subject, query, 'query', runtime),
            c.traceId,
          );
        },
        'validate',
      );
      const exportPath = kind ? prefix.replace(/\/queries$/, '/exports') : prefix + '/exports';
      register(
        fastify,
        'POST',
        exportPath,
        'dataset.export',
        false,
        async (c) => {
          const { query, runtime } = await prepare(c, kind);
          return gateway.create(c.tx, c.subject, query, 'export', c.traceId, runtime);
        },
        'mutate',
        async (c) => {
          const { query, runtime } = await prepare(c, kind);
          await gateway.authorize(c.tx, c.subject, query, 'export', runtime);
        },
      );
    }
    register(
      fastify,
      'POST',
      '/queries/diagnostics/validate',
      'query.diagnose',
      true,
      async (c) =>
        gateway.validation(
          await gateway.authorize(
            c.tx,
            c.subject,
            (c.req.body as S['CreateTestQuery']).query,
            'query',
          ),
          c.traceId,
        ),
      'validate',
    );
    register(fastify, 'GET', '/query-jobs/{queryJobId}', 'session.read', false, async (c) =>
      jobDto((await gateway.authorizedJob(c.tx, c.subject, c.params['queryJobId'] ?? '')).row),
    );
    register(
      fastify,
      'POST',
      '/query-jobs/{queryJobId}/cancel',
      'session.read',
      false,
      (c) => jobs.cancel(c.tx, c.subject, c.params['queryJobId'] ?? ''),
      'mutate',
    );
    register(
      fastify,
      'GET',
      '/query-jobs/{queryJobId}/export',
      'dataset.export',
      false,
      async (c) => {
        const { row } = await gateway.authorizedJob(c.tx, c.subject, c.params['queryJobId'] ?? '');
        if (row.purpose !== 'export' || row.status !== 'succeeded' || !row.result)
          throw new Fault(409, 'QUERY_RESULT_NOT_READY');
        const cell = (v: unknown) => {
          let s = v === null ? '' : String(v);
          if (/^[\s\u200b-\u200f\uFEFF]*[=+\-@]|^[\t\r\n]/.test(s)) s = "'" + s;
          return '"' + s.replaceAll('"', '""') + '"';
        };
        return {
          csv:
            '\uFEFF' +
            [
              row.result.columns.map((c) => cell(c.key)).join(','),
              ...row.result.rows.map((r) => r.map(cell).join(',')),
            ].join('\r\n'),
          truncated: row.result.truncated,
        };
      },
    );
    register(
      fastify,
      'POST',
      '/datasets/{datasetId}/query-policies',
      'query.policy.manage',
      true,
      (c) =>
        gateway.createPolicy(
          c.tx,
          c.subject,
          c.params['datasetId'] ?? '',
          c.req.body as S['QueryPolicyInput'],
        ),
      'mutate',
    );
    register(
      fastify,
      'GET',
      '/datasets/{datasetId}/query-policies',
      'query.policy.manage',
      true,
      async (c) => ({
        items: await gateway.policies(c.tx, c.subject, c.params['datasetId'] ?? ''),
      }),
    );
    register(
      fastify,
      'POST',
      '/organizations/{orgId}/members/{userId}/data-scope',
      'permission.manage',
      true,
      async (c) => {
        const body = c.req.body as S['MemberDataScope'];
        await identity.setDataScope(
          c.tx,
          c.subject,
          c.params['userId'] ?? '',
          body.departmentCodes,
        );
        await catalog.invalidate(c.tx, c.subject.organizationId);
        return body;
      },
      'mutate',
    );
    register(fastify, 'GET', '/query-audits', 'query.audit.read', true, async (c) => ({
      items: await c.tx.all<S['QueryAudit']>(
        `SELECT q.id,q.organization_id AS "organizationId",q.user_id AS "userId",q.job_id AS "jobId",q.app_id AS "appId",q.report_id AS "reportId",q.dataset_id AS "datasetId",q.environment,q.duration_ms AS "durationMs",q.row_count AS "rowCount",q.status,q.permission_result AS "permissionResult",q.trace_id AS "traceId",q.slow,q.created_at AS "createdAt",j.deployment_id AS "deploymentId",d.release_request_id AS "releaseRequestId" FROM query_audits q LEFT JOIN query_jobs j ON j.organization_id=q.organization_id AND j.id=q.job_id LEFT JOIN deployments d ON d.organization_id=j.organization_id AND d.id=j.deployment_id WHERE q.organization_id=$1 ORDER BY q.created_at DESC,q.id DESC LIMIT 100`,
        [c.subject.organizationId],
      ),
    }));
    fastify.post('/v1/internal/query-gateway/:orgId/:jobId/lease', async (req, reply) => {
      const p = req.params as { orgId: string; jobId: string },
        b = req.body as { environment?: unknown };
      let target: WorkerTarget | undefined;
      try {
        if (
          !uuid.test(p.orgId) ||
          !uuid.test(p.jobId) ||
          !b ||
          Object.keys(b).join(',') !== 'environment' ||
          !['test', 'production'].includes(String(b.environment))
        )
          throw new Error();
        const environment = b.environment as 'test' | 'production';
        target = workers[environment];
        if (
          !target ||
          (environment === 'production' &&
            !(req.raw.socket as import('node:tls').TLSSocket).authorized)
        )
          throw new Error();
        verifier.verify(target.key, 'POST', req.url, b, req.headers);
        const plan = await jobs.lease(p.orgId, p.jobId, environment);
        return reply.headers(signedHeaders(target.key, 'RESPONSE', req.url, plan)).send(plan);
      } catch {
        const body = { error: 'QUERY_LEASE_REJECTED' };
        if (target) reply.headers(signedHeaders(target.key, 'RESPONSE', req.url, body));
        return reply.code(403).send(body);
      }
    });
  }
  return {
    releaseQueries: {
      scope: (tx: Sql, s: Subject, ref: S['DatasetRef'], fields: string[], metrics: string[]) =>
        gateway.releaseScope(tx, s, ref, fields, metrics),
    },
    productionSites: {
      open: (tx: Sql, s: Subject, appId: string) => gateway.releases.site(tx, s, appId),
      async query(tx: Sql, s: Subject, appId: string, input: S['StudioQuery'], trace: string) {
        const site = await gateway.releases.site(tx, s, appId);
        const bound = site.manifest.queries.find((q) => q.key === input.queryKey);
        if (!bound) throw new Fault(422, 'INVALID_QUERY_BINDING');
        if (input.timeRange && input.timeRange.fieldKey !== bound.query.timeRange?.fieldKey)
          throw new Fault(422, 'INVALID_FILTER_BINDING');
        return gateway.create(
          tx,
          s,
          {
            ...bound.query,
            filters: [...bound.query.filters, ...input.filters],
            ...(input.timeRange ? { timeRange: input.timeRange } : {}),
          },
          'query',
          trace,
          { kind: 'app', resourceId: appId },
        );
      },
    },
    registerRoutes,
    start: () => jobs.start(),
    close: () => jobs.close(),
    testQueries: {
      inspect: inspectDataset,
      read: async (tx: Sql, s: Subject, id: string) =>
        jobDto((await gateway.authorizedJob(tx, s, id)).row),
      cancel: (tx: Sql, s: Subject, id: string) => jobs.cancel(tx, s, id),
      async auditDenied(tx: Sql, s: Subject, appId: string, trace: string, code: string) {
        await gateway.audit(tx, s, {
          appId,
          environment: 'test',
          durationMs: 0,
          rowCount: 0,
          status: code,
          allowed: false,
          traceId: trace,
        });
      },
      async reference(tx: Sql, s: Subject, r: S['DatasetRef']) {
        await identity.queryGrant(tx, s, r.datasetId, 'dataset.read');
        await identity.queryGrant(tx, s, r.datasetId, 'dataset.query.test');
        const model = await catalog.queryDataset(
          tx,
          s.organizationId,
          r.datasetId,
          r.datasetVersionId,
        );
        if (model.dataset.status !== 'enabled' || model.version.id !== r.datasetVersionId)
          throw new Fault(422, 'INVALID_DATASET_VERSION');
      },
      async validate(tx: Sql, s: Subject, q: S['QuerySpec']) {
        await gateway.authorize(tx, s, q, 'query');
      },
      create: (tx: Sql, s: Subject, q: S['QuerySpec'], trace: string, app?: TestAppContext) =>
        gateway.create(tx, s, q, 'query', trace, undefined, app),
    },
  };
}
