import { randomUUID } from 'node:crypto';
import { SignatureVerifier, signedHeaders } from '@eas/connector-transport';
import type { components } from '@eas/api-contract';
import type { FastifyInstance, HTTPMethods } from 'fastify';
import type { Database, Sql } from '../infrastructure/database.js';
import { Mutations } from '../infrastructure/mutations.js';
import { Fault, requireValue } from '../infrastructure/errors.js';
import type { Identity, Subject, Actor } from '../identity/identity.js';
import type { WorkerTarget } from '../infrastructure/worker-target.js';
import type { contractValidation } from '../infrastructure/contract-validation.js';
import type { StudioReleasePort } from '../studio/release-port.js';
import type { CatalogReleasePort } from '../catalog/release-port.js';
import { Releases, type DeploymentRow, type ReleaseQueryPort } from './service.js';
import { Deployments } from './deployments.js';
type S = components['schemas'];
export interface ProductionSitePort {
  open(tx: Sql, s: Subject, appId: string): Promise<unknown>;
  query(
    tx: Sql,
    s: Subject,
    appId: string,
    input: S['StudioQuery'],
    trace: string,
  ): Promise<unknown>;
}
export function createReleaseRuntime(
  db: Database,
  identity: Identity,
  studio: StudioReleasePort,
  catalog: CatalogReleasePort,
  queries: ReleaseQueryPort,
  productionSites: ProductionSitePort,
  contract: Awaited<ReturnType<typeof contractValidation>>,
  worker: WorkerTarget | undefined,
  production: WorkerTarget | undefined,
) {
  const releases = new Releases(identity, studio, catalog, queries),
    deployments = new Deployments(db, releases, worker, production),
    mutations = new Mutations(db, identity),
    verifier = new SignatureVerifier(),
    uuid = /^[a-f0-9-]{36}$/i;
  async function registerRoutes(app: FastifyInstance) {
    type C = { tx: Sql; s: Subject; p: Record<string, string>; body: unknown; trace: string };
    function route(
      method: HTTPMethods,
      path: string,
      fn: (c: C) => Promise<unknown>,
      status = 200,
    ) {
      const op = requireValue(contract.spec.paths[path]?.[method.toLowerCase()]);
      app.route({
        method,
        url: '/v1' + path.replaceAll(/\{(\w+)\}/g, ':$1'),
        handler: async (req, reply) => {
          const trace = randomUUID();
          let auditActor: Actor | undefined, auditOrg: string | undefined;
          reply.header('Cache-Control', 'no-store').header('X-Trace-Id', trace);
          try {
            const actor = await identity.authenticate(req),
              org = req.headers['x-organization-id'],
              p = req.params as Record<string, string>;
            auditActor = actor;
            if (typeof org === 'string' && uuid.test(org)) auditOrg = org;
            if (
              typeof org !== 'string' ||
              !uuid.test(org) ||
              Object.values(p).some((value) => !uuid.test(value)) ||
              Object.keys(req.query as object).length
            )
              throw new Fault(400, 'VALIDATION_ERROR');
            contract.body(op, req.body);
            const authorize = async (tx: Sql, s: Subject) => {
              if (p['releaseRequestId']) await releases.access(tx, s, p['releaseRequestId']);
              if (p['deploymentId']) {
                const d = requireValue(
                  await tx.one<DeploymentRow>(
                    'SELECT * FROM deployments WHERE organization_id=$1 AND id=$2',
                    [org, p['deploymentId']],
                  ),
                );
                await releases.access(tx, s, d.release_request_id);
              }
            };
            let body: unknown;
            if (method === 'GET')
              body = await db.tenant(org, async (tx) => {
                const s = await identity.subject(tx, actor, org);
                identity.require(
                  s,
                  op['x-permissions']?.[0] ?? 'release.read',
                  op['x-human-only'] === true,
                );
                await authorize(tx, s);
                return fn({ tx, s, p, body: req.body, trace });
              });
            else {
              const result = await mutations.run(
                req,
                actor,
                org,
                op.operationId,
                op['x-permissions']?.[0] ?? 'release.read',
                op['x-human-only'] === true,
                async (tx, s) => ({ body: await fn({ tx, s, p, body: req.body, trace }), status }),
                authorize,
              );
              body = result.body;
            }
            return reply.code(status).send(body);
          } catch (error) {
            const fault =
              error instanceof Fault
                ? error
                : new Fault(
                    503,
                    'RELEASE_DEPENDENCY_UNAVAILABLE',
                    '发布操作未完成，请按追踪编号查看后台日志。',
                  );
            if (auditActor && auditOrg)
              await db
                .tenant(auditOrg, (tx) =>
                  tx.exec(
                    "INSERT INTO audit_logs(organization_id,actor_user_id,action,outcome,request_id,safe_metadata) VALUES($1,$2,$3,'deny',$4,$5)",
                    [
                      auditOrg,
                      auditActor!.userId,
                      op.operationId,
                      req.id,
                      JSON.stringify({ code: fault.code, traceId: trace }),
                    ],
                  ),
                )
                .catch(() => {});
            if (!(error instanceof Fault))
              console.warn(
                JSON.stringify({
                  event: 'release.failure',
                  operation: op.operationId,
                  traceId: trace,
                  storageCode:
                    typeof (error as { code?: unknown })?.code === 'string'
                      ? (error as { code: string }).code
                      : 'UNEXPECTED',
                }),
              );
            return reply.code(fault.status).send({
              error: {
                code: fault.code,
                message: fault.safeMessage,
                requestId: req.id,
                ...(fault.details.length ? { details: fault.details } : {}),
              },
              traceId: trace,
            });
          }
        },
      });
    }
    route('GET', '/release-requests', (c) => releases.list(c.tx, c.s));
    route(
      'POST',
      '/release-requests',
      (c) => releases.create(c.tx, c.s, c.body as S['Stage06CreateRelease'], c.trace),
      201,
    );
    route('GET', '/release-options', async (c) => ({
      ...(await identity.releaseMembers(c.tx, c.s)),
      apps: await studio.apps(c.tx, c.s),
      deploymentWorkerConfigured: !!worker,
      productionConnectorConfigured: !!production,
    }));
    route('GET', '/release-requests/{releaseRequestId}', (c) =>
      releases.get(c.tx, c.s, c.p['releaseRequestId']!),
    );
    route('POST', '/release-requests/{releaseRequestId}/submit', (c) =>
      releases.submit(c.tx, c.s, c.p['releaseRequestId']!, c.trace),
    );
    route('POST', '/release-requests/{releaseRequestId}/cancel', (c) =>
      releases.cancel(c.tx, c.s, c.p['releaseRequestId']!, c.trace),
    );
    route('POST', '/release-requests/{releaseRequestId}/approvals', (c) =>
      releases.approve(
        c.tx,
        c.s,
        c.p['releaseRequestId']!,
        c.body as S['Stage06Approval'],
        c.trace,
      ),
    );
    route('GET', '/release-requests/{releaseRequestId}/approvals', (c) =>
      releases.get(c.tx, c.s, c.p['releaseRequestId']!),
    );
    route(
      'POST',
      '/release-requests/{releaseRequestId}/deployments',
      (c) => releases.deploy(c.tx, c.s, c.p['releaseRequestId']!, c.trace),
      202,
    );
    route('GET', '/deployments/{deploymentId}', async (c) =>
      releases.deploymentDto(
        c.tx,
        requireValue(
          await c.tx.one<DeploymentRow>(
            'SELECT * FROM deployments WHERE organization_id=$1 AND id=$2',
            [c.s.organizationId, c.p['deploymentId']],
          ),
        ),
      ),
    );
    route('POST', '/deployments/{deploymentId}/retry', (c) =>
      releases.retry(c.tx, c.s, c.p['deploymentId']!, c.trace),
    );
    route('GET', '/apps/{appId}/release-policy', (c) => releases.policy(c.tx, c.s, c.p['appId']!));
    route('PUT', '/apps/{appId}/release-policy', (c) =>
      releases.setPolicy(c.tx, c.s, c.p['appId']!, c.body as S['SetReleasePolicy']),
    );
    route(
      'POST',
      '/apps/{appId}/rollback-requests',
      (c) => releases.rollback(c.tx, c.s, c.p['appId']!, c.body as S['Stage06Rollback'], c.trace),
      201,
    );
    route('GET', '/apps/{appId}/deployments', async (c) => {
      const rows = await c.tx.all<DeploymentRow>(
        'SELECT * FROM deployments WHERE organization_id=$1 AND app_id=$2 ORDER BY created_at DESC,id DESC',
        [c.s.organizationId, c.p['appId']],
      );
      const items = [];
      for (const d of rows) {
        await releases.access(c.tx, c.s, d.release_request_id);
        items.push(await releases.deploymentDto(c.tx, d));
      }
      return { items };
    });
    route('GET', '/runtime/apps/{appId}/site', (c) =>
      productionSites.open(c.tx, c.s, c.p['appId']!),
    );
    route(
      'POST',
      '/runtime/apps/{appId}/bound-queries',
      (c) => productionSites.query(c.tx, c.s, c.p['appId']!, c.body as S['StudioQuery'], c.trace),
      202,
    );
    app.post('/v1/internal/releases/:orgId/:deploymentId/inspection', async (req, reply) => {
      const p = req.params as { orgId: string; deploymentId: string };
      try {
        if (
          !production ||
          !(req.raw.socket as import('node:tls').TLSSocket).authorized ||
          !uuid.test(p.orgId) ||
          !uuid.test(p.deploymentId) ||
          !req.body ||
          typeof req.body !== 'object' ||
          Object.keys(req.body).join(',') !== 'leaseToken'
        )
          throw new Error();
        verifier.verify(production.key, 'POST', req.url, req.body, req.headers);
        const body = await db.tenant(p.orgId, (tx) =>
          deployments.inspection(
            tx,
            p.orgId,
            p.deploymentId,
            (req.body as { leaseToken: string }).leaseToken,
          ),
        );
        return reply.headers(signedHeaders(production.key, 'RESPONSE', req.url, body)).send(body);
      } catch {
        const body = { error: 'RELEASE_INSPECTION_REJECTED' };
        if (production) reply.headers(signedHeaders(production.key, 'RESPONSE', req.url, body));
        return reply.code(403).send(body);
      }
    });
  }
  return { registerRoutes, start: () => deployments.start(), close: () => deployments.close() };
}
