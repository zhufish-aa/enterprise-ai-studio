import { registerAccounts } from '../identity/accounts.js';
import { createEndpoint } from './endpoints.js';
import { configureConnection } from './configure-connection.js';
import type { ManagedSecretConfig } from '@eas/connector-transport';
import { registerPersonalTokens } from '../identity/personal-tokens.js';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyRequest, FastifyReply, HTTPMethods } from 'fastify';
import type { CatalogEnvironment, components } from '@eas/api-contract';
import {
  SignatureVerifier,
  signedHeaders,
  signedRequest,
  digest,
  type MutualTls,
} from '@eas/connector-transport';
import { Database, type Sql } from '../infrastructure/database.js';
import { Fault, requireValue } from '../infrastructure/errors.js';
import { Mutations, type Result } from '../infrastructure/mutations.js';
import { Identity, type Actor, type Subject, type AuthConfig } from '../identity/identity.js';
import { RuntimeGrantInvalidator } from '../releases/invalidation.js';
import { CatalogService } from './service.js';
import { CatalogJobs, type WorkerTarget } from './jobs.js';
import { contractValidation } from './validation.js';
import {
  type S,
  type ConnectionRow,
  type EndpointRow,
  type JobRow,
  type DatasetRow,
  connectionDto,
  endpointDto,
} from './models.js';
import { createQueryRuntime } from '../query-gateway/runtime.js';
import { createStudioRuntime } from '../studio/runtime.js';
import { createReleaseRuntime } from '../releases/runtime.js';
import { createMcpRuntime } from '../mcp/runtime.js';
import { authorizeSiteDataSource } from './site-data-source-policy.js';
export interface CatalogOptions {
  databaseUrl: string;
  auth: AuthConfig;
  cursorKey: string;
  workers: Partial<Record<CatalogEnvironment, WorkerTarget>>;
  managedSecrets?: Partial<Record<CatalogEnvironment, ManagedSecretConfig>> | undefined;
  buildWorker?: WorkerTarget | undefined;
  previewWorker?: WorkerTarget | undefined;
  deploymentWorker?: WorkerTarget | undefined;
  siteWorker?: WorkerTarget | undefined;
  log?: (record: Record<string, unknown>) => void;
  apiTls?: MutualTls | undefined;
}
const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
export async function createCatalogRuntime(options: CatalogOptions) {
  if (options.cursorKey.length < 32) throw new Error('CURSOR_KEY_REQUIRED');
  if (options.auth.passwordAuth?.enabled) {
    const cfg = options.auth.passwordAuth;
    if (
      !cfg.allowedOrigins.length ||
      cfg.allowedOrigins.some((origin) => {
        const url = new URL(origin);
        return (
          origin !== url.origin ||
          url.username ||
          url.password ||
          (url.protocol !== 'https:' &&
            !(
              options.auth.allowLocalSessions &&
              !cfg.secureCookies &&
              url.protocol === 'http:' &&
              ['localhost', '127.0.0.1'].includes(url.hostname)
            ))
        );
      })
    )
      throw new Error('PASSWORD_AUTH_ORIGIN_REJECTED');
    if (!options.auth.allowLocalSessions && !cfg.secureCookies)
      throw new Error('SECURE_COOKIE_REQUIRED');
  }
  const db = new Database(options.databaseUrl),
    identity = new Identity(db, { ...options.auth, csrfKey: options.cursorKey }),
    mutations = new Mutations(db, identity),
    service = new CatalogService(identity, new RuntimeGrantInvalidator()),
    contract = await contractValidation();
  const role = await db.global.one<{ rolsuper: boolean; rolbypassrls: boolean }>(
    'SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user',
  );
  if (!role || role.rolsuper || role.rolbypassrls) {
    await db.close();
    throw new Error('API_RUNTIME_ROLE_UNSAFE');
  }
  const jobs = new CatalogJobs(db, identity, service, options.workers, contract.result),
    verifier = new SignatureVerifier();
  const log = options.log ?? (() => {});
  const mcp = createMcpRuntime(db, identity, options.auth.passwordAuth?.allowedOrigins ?? [], log);
  const queryRuntime = createQueryRuntime(
    db,
    identity,
    service,
    options.workers,
    options.cursorKey,
    contract,
    log,
    { checkTestVersion: (tx, s, context) => studio.access.checkTestVersion(tx, s, context) },
  );
  const studio = createStudioRuntime(
    db,
    identity,
    queryRuntime.testQueries,
    contract,
    options.buildWorker,
    options.previewWorker,
    options.siteWorker,
    (subject, input) => authorizeSiteDataSource(db, identity, subject, input),
  );
  const releases = createReleaseRuntime(
    db,
    identity,
    studio.releasePort,
    service,
    queryRuntime.releaseQueries,
    queryRuntime.productionSites,
    contract,
    options.deploymentWorker,
    options.workers.production,
  );
  type Context = {
    tx: Sql;
    subject: Subject;
    actor: Actor;
    req: FastifyRequest;
    params: Record<string, string>;
    query: Record<string, string>;
  };
  const resource = async (ctx: Context, type: 'source' | 'dataset', id: string) =>
    type === 'source'
      ? service.sourceRow(ctx.tx, ctx.subject.organizationId, id)
      : service.datasetRow(ctx.tx, ctx.subject.organizationId, id);
  const page = (
    items: unknown[],
    req: FastifyRequest,
    subject: Subject,
    operation: string,
  ): unknown => {
    const query = req.query as Record<string, string | undefined>,
      size = Number(query['pageSize'] ?? 20);
    if (!Number.isInteger(size) || size < 1 || size > 100) throw new Fault(400, 'VALIDATION_ERROR');
    const scope = digest({
      organizationId: subject.organizationId,
      userId: subject.userId,
      operation,
      filters: Object.fromEntries(
        Object.entries(query).filter(([k]) => !['cursor', 'pageSize'].includes(k)),
      ),
    });
    const identityOf = (value: unknown) => {
      const r = value as Record<string, unknown>;
      return String(r['id'] ?? r['userId'] ?? r['engine']);
    };
    let start = 0;
    if (query['cursor']) {
      try {
        const [encoded, signature] = query['cursor'].split('.');
        if (
          !encoded ||
          !signature ||
          query['cursor'].length > 1024 ||
          !/^[a-f0-9]{64}$/.test(signature)
        )
          throw new Error();
        const expected = createHmac('sha256', options.cursorKey).update(encoded).digest();
        if (!timingSafeEqual(expected, Buffer.from(signature, 'hex'))) throw new Error();
        const value = JSON.parse(Buffer.from(encoded, 'base64url').toString()) as {
          scope: string;
          expires: number;
          last: string;
        };
        if (value.scope !== scope || value.expires < Date.now()) throw new Error();
        const index = items.findIndex((item) => identityOf(item) === value.last);
        if (index < 0) throw new Error();
        start = index + 1;
      } catch {
        throw new Fault(400, 'VALIDATION_ERROR');
      }
    }
    const selected = items.slice(start, start + size);
    let nextCursor: string | null = null;
    if (start + size < items.length) {
      const encoded = Buffer.from(
        JSON.stringify({ scope, expires: Date.now() + 900_000, last: identityOf(selected.at(-1)) }),
      ).toString('base64url');
      nextCursor =
        encoded + '.' + createHmac('sha256', options.cursorKey).update(encoded).digest('hex');
    }
    return { items: selected, nextCursor };
  };
  const error = async (
    req: FastifyRequest,
    reply: FastifyReply,
    cause: unknown,
    operation: string,
    actor?: Actor,
    org?: string,
  ) => {
    const code = (cause as { code?: unknown })?.code;
    const fault =
      cause instanceof Fault
        ? cause
        : typeof code === 'string' && code === '23505'
          ? new Fault(409, 'STATE_CONFLICT')
          : typeof code === 'string' && ['23503', '23514'].includes(code)
            ? new Fault(422, 'VALIDATION_ERROR')
            : new Fault(503, 'DEPENDENCY_UNAVAILABLE');
    log({
      event: 'catalog.request',
      operation,
      status: fault.status,
      code: fault.code,
      requestId: req.id,
    });
    if (actor && org && uuid.test(org))
      await db
        .tenant(org, (tx) =>
          tx.exec(
            `INSERT INTO audit_logs(organization_id,actor_user_id,action,outcome,request_id) VALUES($1,$2,$3,'deny',$4)`,
            [org, actor.userId, operation, req.id],
          ),
        )
        .catch(() => {});
    return reply.code(fault.status).send({
      error: {
        code: fault.code,
        message: fault.safeMessage,
        ...(fault.details.length ? { details: fault.details } : {}),
        requestId: req.id,
      },
    });
  };
  function register(
    fastify: FastifyInstance,
    method: HTTPMethods,
    path: string,
    fn: (ctx: Context) => Promise<unknown>,
    mutate = false,
  ) {
    const operation = requireValue(contract.spec.paths[path]?.[method.toLowerCase()]);
    const permission = operation['x-permissions']?.[0] ?? 'session.read',
      human = operation['x-human-only'] === true;
    fastify.route({
      method,
      url: '/v1' + path.replaceAll(/\{(\w+)\}/g, ':$1'),
      handler: async (req, reply) => {
        let actor: Actor | undefined, organizationId: string | undefined;
        try {
          actor = await identity.authenticate(req);
          const params = req.params as Record<string, string>,
            query = req.query as Record<string, string>;
          for (const value of Object.values(params))
            if (!uuid.test(value)) throw new Fault(400, 'VALIDATION_ERROR');
          const allowedQuery = new Set(
            (operation.parameters ?? []).flatMap((p) => {
              const resolved = p.$ref
                ? contract.spec.components.parameters[p.$ref.split('/').at(-1) ?? '']
                : p;
              return resolved?.in === 'query' && resolved.name ? [resolved.name] : [];
            }),
          );
          if (Object.keys(query).some((k) => !allowedQuery.has(k)))
            throw new Fault(400, 'VALIDATION_ERROR');
          for (const parameter of operation.parameters ?? []) {
            const p = parameter.$ref
              ? contract.spec.components.parameters[parameter.$ref.split('/').at(-1) ?? '']
              : parameter;
            if (p?.in === 'query' && p.required && p.name && query[p.name] === undefined)
              throw new Fault(400, 'VALIDATION_ERROR');
          }
          if (query['environment'] && !['test', 'production'].includes(query['environment']))
            throw new Fault(400, 'VALIDATION_ERROR');
          contract.body(operation, req.body);
          const header = req.headers['x-organization-id'];
          if (typeof header !== 'string' || !uuid.test(header))
            throw new Fault(400, 'VALIDATION_ERROR');
          organizationId = header;
          if (params['orgId'] && params['orgId'] !== organizationId)
            throw new Fault(403, 'FORBIDDEN');
          let result: Result;
          if (mutate) {
            const currentActor = actor;
            const body = await mutations.run(
              req,
              currentActor,
              organizationId,
              operation.operationId,
              permission,
              human,
              async (tx, subject) => {
                const value = await fn({ tx, subject, actor: currentActor, req, params, query });
                const status =
                  path.endsWith('/tests') ||
                  path.endsWith('/metadata-syncs') ||
                  path.endsWith('/preview') ||
                  path.endsWith('/retry')
                    ? 202
                    : method === 'POST'
                      ? 201
                      : 200;
                const revision = (value as { revision?: number } | null)?.revision;
                return { body: value, status, ...(revision ? { etag: '"' + revision + '"' } : {}) };
              },
            );
            result = body;
          } else {
            const currentActor = actor;
            result = await db.tenant(organizationId, async (tx) => {
              const subject = await identity.subject(tx, currentActor, organizationId ?? '');
              identity.require(subject, permission, human);
              const value = await fn({ tx, subject, actor: currentActor, req, params, query });
              const paginated = operation.parameters?.some((p) => p.$ref?.endsWith('/PageSize'));
              const body = paginated
                ? page(value as unknown[], req, subject, operation.operationId)
                : value;
              const revision = (body as { revision?: number } | null)?.revision;
              return { body, status: 200, ...(revision ? { etag: '"' + revision + '"' } : {}) };
            });
          }
          if (result.etag) reply.header('ETag', result.etag);
          log({
            event: 'catalog.request',
            operation: operation.operationId,
            status: result.status ?? 200,
            requestId: req.id,
          });
          return reply.code(result.status ?? 200).send(result.body);
        } catch (cause) {
          return error(req, reply, cause, operation.operationId, actor, organizationId);
        }
      },
    });
  }
  async function registerRoutes(fastify: FastifyInstance) {
    mcp.registerRoutes(fastify);
    registerPersonalTokens(fastify, db, identity, contract);
    registerAccounts(fastify, db, identity, contract, options.auth.passwordAuth, options.cursorKey);
    fastify.get('/v1/me', async (req, reply) => {
      try {
        const actor = await identity.authenticate(req);
        const organizations = await identity.memberships(actor);
        let subject: Subject | undefined;
        const header = req.headers['x-organization-id'];
        if (header !== undefined) {
          if (typeof header !== 'string' || !uuid.test(header))
            throw new Fault(400, 'VALIDATION_ERROR');
          subject = await db.tenant(header, (tx) => identity.subject(tx, actor, header));
        }
        return {
          id: actor.userId,
          displayName: actor.displayName,
          status: 'active',
          organizations,
          organizationId: subject?.organizationId ?? null,
          permissions: subject ? [...subject.actions].sort() : [],
          clientKind: actor.clientKind,
        };
      } catch (cause) {
        return error(req, reply, cause, 'getMe');
      }
    });
    fastify.get('/v1/organizations', async (req, reply) => {
      try {
        const actor = await identity.authenticate(req),
          members = await identity.memberships(actor);
        const rows = await db.global.all<{
          id: string;
          key: string;
          name: string;
          revision: number;
          created_at: Date;
        }>(
          'SELECT id,key,name,revision,created_at FROM organizations WHERE id=ANY($1::uuid[]) ORDER BY id',
          [members.map((m) => m.id)],
        );
        return {
          items: rows.map((r) => ({
            id: r.id,
            key: r.key,
            name: r.name,
            revision: Number(r.revision),
            createdAt: r.created_at.toISOString(),
          })),
          nextCursor: null,
        };
      } catch (cause) {
        return error(req, reply, cause, 'listOrganizations');
      }
    });
    register(fastify, 'GET', '/organizations/{orgId}/members', async ({ tx, subject }) =>
      (
        await tx.all<{ user_id: string; display_name: string; status: string; created_at: Date }>(
          'SELECT m.user_id,u.display_name,m.status,m.created_at FROM organization_members m JOIN users u ON u.id=m.user_id WHERE m.organization_id=$1 ORDER BY m.created_at DESC,m.user_id DESC',
          [subject.organizationId],
        )
      ).map((r) => ({
        organizationId: subject.organizationId,
        userId: r.user_id,
        displayName: r.display_name,
        status: r.status,
        createdAt: r.created_at.toISOString(),
      })),
    );
    register(fastify, 'GET', '/logical-data-sources', (c) => service.sources(c.tx, c.subject));
    register(
      fastify,
      'POST',
      '/logical-data-sources',
      (c) => service.createSource(c.tx, c.subject, c.req.body as S['CreateLogicalDataSource']),
      true,
    );
    register(fastify, 'GET', '/logical-data-sources/{logicalDataSourceId}', (c) =>
      service.source(c.tx, c.subject, c.params['logicalDataSourceId'] ?? ''),
    );
    register(
      fastify,
      'PATCH',
      '/logical-data-sources/{logicalDataSourceId}',
      (c) =>
        service.updateSource(
          c.tx,
          c.subject,
          c.params['logicalDataSourceId'] ?? '',
          c.req.body as S['UpdateLogicalDataSource'],
          c.req,
        ),
      true,
    );
    register(fastify, 'GET', '/physical-connections', async ({ tx, subject }) =>
      (
        await tx.all<ConnectionRow>(
          'SELECT c.*,e.host,e.port FROM physical_connections c JOIN network_endpoints e ON e.organization_id=c.organization_id AND e.id=c.endpoint_id WHERE c.organization_id=$1 ORDER BY c.created_at DESC,c.id DESC',
          [subject.organizationId],
        )
      ).map(connectionDto),
    );
    register(
      fastify,
      'POST',
      '/physical-connections',
      (c) => service.createConnection(c.tx, c.subject, c.req.body as S['CreatePhysicalConnection']),
      true,
    );
    register(
      fastify,
      'POST',
      '/physical-connections/configure',
      (c) =>
        configureConnection(
          c.tx,
          c.subject,
          c.req.body as S['ConfigurePhysicalConnection'],
          identity,
          service,
          options.managedSecrets,
          options.auth.allowLocalSessions,
        ),
      true,
    );
    register(
      fastify,
      'PATCH',
      '/physical-connections/{physicalConnectionId}',
      (c) =>
        service.updateConnection(
          c.tx,
          c.subject,
          c.params['physicalConnectionId'] ?? '',
          c.req.body as S['UpdatePhysicalConnection'],
          c.req,
        ),
      true,
    );
    register(fastify, 'GET', '/network-endpoints', async ({ tx, subject }) =>
      (
        await tx.all<EndpointRow>(
          'SELECT * FROM network_endpoints WHERE organization_id=$1 ORDER BY created_at DESC,id DESC',
          [subject.organizationId],
        )
      ).map(endpointDto),
    );
    register(
      fastify,
      'POST',
      '/network-endpoints',
      (c) => createEndpoint(c.tx, c.subject, c.req.body as S['CreateNetworkEndpoint']),
      true,
    );
    register(fastify, 'GET', '/credential-profiles', ({ tx, subject }) =>
      tx.all(
        'SELECT id,label,environment,engine,allowed_endpoint_ids AS "endpointIds" FROM credential_profiles WHERE organization_id=$1 ORDER BY created_at DESC,id DESC',
        [subject.organizationId],
      ),
    );
    register(fastify, 'GET', '/database-adapters', async () => [
      {
        engine: 'postgresql',
        status: 'verified-real',
        driver: 'pg 8.23.1',
        notes:
          'PostgreSQL 18.4: real connection, metadata, least-privilege role and TEST preview verified by catalog.integration.test.mjs.',
      },
      {
        engine: 'mysql',
        status: 'implemented-unverified',
        driver: 'mysql2 3.24.6',
        notes: 'No real MySQL instance has been validated in this workspace.',
      },
      {
        engine: 'sqlserver',
        status: 'implemented-unverified',
        driver: 'mssql 12.7.11 / tedious',
        notes: 'No real SQL Server instance has been validated in this workspace.',
      },
    ]);
    register(
      fastify,
      'POST',
      '/physical-connections/{physicalConnectionId}/tests',
      (c) => service.createJob(c.tx, c.subject, c.params['physicalConnectionId'] ?? '', 'health'),
      true,
    );
    register(fastify, 'GET', '/connection-tests/{connectionTestId}', (c) =>
      service.job(c.tx, c.subject, c.params['connectionTestId'] ?? ''),
    );
    register(
      fastify,
      'POST',
      '/physical-connections/{physicalConnectionId}/metadata-syncs',
      (c) =>
        service.createJob(c.tx, c.subject, c.params['physicalConnectionId'] ?? '', 'metadata', {
          relations: (c.req.body as S['CreateMetadataSync']).relations,
        }),
      true,
    );
    register(fastify, 'GET', '/physical-connections/{physicalConnectionId}/metadata', (c) =>
      service.snapshots(c.tx, c.subject, c.params['physicalConnectionId'] ?? ''),
    );
    register(fastify, 'GET', '/catalog-jobs/{catalogJobId}', (c) =>
      service.job(c.tx, c.subject, c.params['catalogJobId'] ?? ''),
    );
    register(
      fastify,
      'POST',
      '/catalog-jobs/{catalogJobId}/retry',
      (c) => service.retry(c.tx, c.subject, c.params['catalogJobId'] ?? ''),
      true,
    );
    register(fastify, 'GET', '/logical-data-sources/{logicalDataSourceId}/mappings', (c) =>
      service.mappings(c.tx, c.subject, c.params['logicalDataSourceId'] ?? ''),
    );
    register(
      fastify,
      'PUT',
      '/logical-data-sources/{logicalDataSourceId}/mappings',
      (c) =>
        service.setMapping(
          c.tx,
          c.subject,
          c.params['logicalDataSourceId'] ?? '',
          c.query['environment'] === 'production' ? 'production' : 'test',
          (c.req.body as S['SetSourceMapping']).physicalConnectionId,
          c.req,
        ),
      true,
    );
    register(fastify, 'GET', '/datasets', (c) => service.datasets(c.tx, c.subject));
    register(
      fastify,
      'POST',
      '/datasets',
      (c) => service.createDataset(c.tx, c.subject, c.req.body as S['CreateDataset']),
      true,
    );
    register(fastify, 'GET', '/datasets/{datasetId}', (c) =>
      service.dataset(c.tx, c.subject, c.params['datasetId'] ?? ''),
    );
    register(
      fastify,
      'PATCH',
      '/datasets/{datasetId}',
      (c) =>
        service.updateDataset(
          c.tx,
          c.subject,
          c.params['datasetId'] ?? '',
          c.req.body as S['UpdateDataset'],
          c.req,
        ),
      true,
    );
    register(fastify, 'GET', '/datasets/{datasetId}/versions', (c) =>
      service.versions(c.tx, c.subject, c.params['datasetId'] ?? ''),
    );
    register(
      fastify,
      'POST',
      '/datasets/{datasetId}/versions',
      (c) =>
        service.createVersion(
          c.tx,
          c.subject,
          c.params['datasetId'] ?? '',
          c.req.body as S['CreateDatasetVersion'],
        ),
      true,
    );
    register(fastify, 'GET', '/dataset-versions/{datasetVersionId}', async (c) =>
      service.presentVersion(
        c.tx,
        c.subject,
        await service.versionRow(
          c.tx,
          c.subject.organizationId,
          c.params['datasetVersionId'] ?? '',
        ),
      ),
    );
    register(
      fastify,
      'POST',
      '/datasets/{datasetId}/preview',
      async () => {
        throw new Fault(410, 'QUERY_GATEWAY_REQUIRED');
      },
      true,
    );
    for (const [path, param, type] of [
      ['datasets', 'datasetId', 'dataset'],
      ['logical-data-sources', 'logicalDataSourceId', 'source'],
    ] as const) {
      register(fastify, 'GET', `/${path}/{${param}}/grants`, async (c) => {
        const r = await resource(c, type, c.params[param] ?? '');
        return identity.grants(c.tx, c.subject, r.id);
      });
      register(
        fastify,
        'POST',
        `/${path}/{${param}}/grants`,
        async (c) => {
          const r = await resource(c, type, c.params[param] ?? '');
          const input = c.req.body as S['CreateDatasetGrant'];
          if (
            (type === 'source' && input.action !== 'source.read') ||
            (type === 'dataset' && !input.action.startsWith('dataset.'))
          )
            throw new Fault(422, 'VALIDATION_ERROR');
          if (type === 'dataset') {
            const versions = await service.versions(c.tx, c.subject, r.id),
              latest = versions[0];
            if (
              !latest ||
              input.fieldKeys.some((k) => !latest.fields.some((f) => f.key === k)) ||
              input.metricKeys.some((k) => !latest.metrics.some((m) => m.key === k))
            )
              throw new Fault(422, 'VALIDATION_ERROR');
          }
          const grant = await identity.createGrant(c.tx, c.subject, r.id, input);
          await service.invalidate(c.tx, c.subject.organizationId);
          return grant;
        },
        true,
      );
    }
    register(
      fastify,
      'DELETE',
      '/resource-grants/{resourceGrantId}',
      async (c) => {
        const grant = await identity.revokeGrant(
          c.tx,
          c.subject,
          c.params['resourceGrantId'] ?? '',
        );
        await service.invalidate(c.tx, c.subject.organizationId);
        return grant;
      },
      true,
    );
    fastify.post('/v1/internal/catalog/:orgId/:jobId/lease', async (req, reply) => {
      const params = req.params as { orgId: string; jobId: string };
      const input = req.body as { environment?: unknown };
      let target: WorkerTarget | undefined;
      try {
        if (
          !uuid.test(params.orgId) ||
          !uuid.test(params.jobId) ||
          !input ||
          Object.keys(input).join(',') !== 'environment' ||
          !['test', 'production'].includes(String(input.environment))
        )
          throw new Fault(400, 'VALIDATION_ERROR');
        const environment = input.environment as CatalogEnvironment;
        target = options.workers[environment];
        if (!target) throw new Fault(403, 'FORBIDDEN');
        if (
          environment === 'production' &&
          !(req.raw.socket as import('node:tls').TLSSocket).authorized
        )
          throw new Fault(403, 'FORBIDDEN');
        verifier.verify(target.key, 'POST', req.url, req.body, req.headers);
        const plan = await jobs.lease(params.orgId, params.jobId, environment);
        reply.headers(signedHeaders(target.key, 'RESPONSE', req.url, plan));
        return reply.send(plan);
      } catch {
        const body = { error: 'LEASE_REJECTED' };
        if (target) reply.headers(signedHeaders(target.key, 'RESPONSE', req.url, body));
        return reply.code(403).send(body);
      }
    });
    await queryRuntime.registerRoutes(fastify);
    await studio.registerRoutes(fastify);
    await releases.registerRoutes(fastify);
  }
  return {
    db,
    identity,
    service,
    jobs,
    registerRoutes,
    async start() {
      jobs.start();
      queryRuntime.start();
      studio.start();
      releases.start();
    },
    async ready() {
      await db.global.one('SELECT 1');
      const target = options.workers.test;
      if (!target) throw new Fault(503, 'DEPENDENCY_UNAVAILABLE');
      await signedRequest(
        new URL('/ping', target.url),
        target.key,
        {},
        { tls: target.tls, allowLocalHttp: target.allowLocalHttp, timeoutMs: 2000 },
      );
    },
    async close() {
      await mcp.close();
      await Promise.all([jobs.close(), queryRuntime.close(), studio.close(), releases.close()]);
      await db.close();
    },
  };
}
export type CatalogRuntime = Awaited<ReturnType<typeof createCatalogRuntime>>;
