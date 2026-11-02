import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type {
  components,
  SiteBuildArtifact,
  SiteHttpResult,
  SiteWorkerResult,
  SiteRuntimeStatus,
} from '@eas/api-contract';
import { signedRequest } from '@eas/connector-transport';
import type { Database, Sql } from '../infrastructure/database.js';
import type { Identity, Subject } from '../identity/identity.js';
import type { contractValidation } from '../infrastructure/contract-validation.js';
import type { WorkerTarget } from '../infrastructure/worker-target.js';
import { Fault, requireValue } from '../infrastructure/errors.js';
type S = components['schemas'];
export interface SiteManagementPort {
  authorize(tx: Sql, subject: Subject, appId: string): Promise<void>;
  artifact(
    tx: Sql,
    subject: Subject,
    appId: string,
    versionId: string,
  ): Promise<{ buildId: string; artifact: SiteBuildArtifact }>;
  preview(tx: Sql, subject: Subject, appId: string, versionId: string): Promise<void>;
  activate(
    tx: Sql,
    subject: Subject,
    appId: string,
    versionId: string,
    expectedRevision: number,
  ): Promise<S['SiteSharing']>;
  authorizeDataSource(
    subject: Subject,
    input: import('@eas/api-contract').SiteDataSourceInput,
  ): Promise<import('@eas/api-contract').SiteDataSourceInput>;
}
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function createSiteRuntime(
  db: Database,
  identity: Identity,
  contract: Awaited<ReturnType<typeof contractValidation>>,
  port: SiteManagementPort,
  worker: WorkerTarget | undefined,
) {
  async function invoke<T>(path: string, body: unknown): Promise<T> {
    if (!worker) throw new Fault(503, 'SITE_WORKER_NOT_CONFIGURED', '站点后端运行服务尚未配置。');
    let response: SiteWorkerResult<T>;
    try {
      response = await signedRequest(new URL(path, worker.url), worker.key, body, {
        tls: worker.tls,
        allowLocalHttp: worker.allowLocalHttp,
        timeoutMs: 170000,
        maxResponseBytes: 40 * 1024 * 1024,
      });
    } catch {
      throw new Fault(
        503,
        'SITE_WORKER_UNAVAILABLE',
        '站点后端运行服务不可用，请查看后端运行状态。',
      );
    }
    if (!response.ok) throw new Fault(409, response.code, response.message);
    return response.value;
  }
  async function subject(req: FastifyRequest, appId: string) {
    const actor = await identity.authenticate(req),
      org = req.headers['x-organization-id'];
    if (typeof org !== 'string' || !uuid.test(org)) throw new Fault(400, 'VALIDATION_ERROR');
    return db.tenant(org, async (tx) => {
      const s = await identity.subject(tx, actor, org);
      await port.authorize(tx, s, appId);
      return s;
    });
  }
  async function audit(
    s: Subject,
    appId: string,
    action: string,
    req: FastifyRequest,
    metadata: Record<string, unknown> = {},
  ) {
    await db.tenant(s.organizationId, (tx) =>
      tx.exec(
        "INSERT INTO audit_logs(organization_id,actor_user_id,action,resource_id,outcome,request_id,safe_metadata) VALUES($1,$2,$3,$4,'allow',$5,$6)",
        [s.organizationId, s.userId, action, appId, req.id, JSON.stringify(metadata)],
      ),
    );
  }
  async function registerRoutes(app: FastifyInstance) {
    const operations = [
      ['GET', '/apps/{appId}/site-data-sources'],
      ['POST', '/apps/{appId}/site-data-sources'],
      ['POST', '/apps/{appId}/site-data-sources/inspect'],
      ['GET', '/apps/{appId}/site-runtime'],
      ['POST', '/apps/{appId}/site-runtime/deploy'],
      ['POST', '/apps/{appId}/site-runtime/activate'],
    ] as const;
    for (const [method, path] of operations)
      app.route({
        method,
        url: '/v1' + path.replace('{appId}', ':appId'),
        handler: async (req, reply) => {
          reply.header('Cache-Control', 'no-store');
          try {
            const appId = (req.params as { appId: string }).appId;
            if (!uuid.test(appId) || Object.keys(req.query as object).length)
              throw new Fault(400, 'VALIDATION_ERROR');
            const op = requireValue(contract.spec.paths[path]?.[method.toLowerCase()]);
            contract.body(op, req.body);
            if (
              method === 'POST' &&
              (typeof req.headers['idempotency-key'] !== 'string' ||
                !uuid.test(req.headers['idempotency-key']))
            )
              throw new Fault(400, 'VALIDATION_ERROR');
            const s = await subject(req, appId),
              scope = { organizationId: s.organizationId, appId };
            let result: unknown;
            if (path.endsWith('/site-data-sources') && method === 'GET')
              result = { items: await invoke('/sources', scope) };
            else if (path.endsWith('/site-data-sources')) {
              let input = req.body as S['SiteDataSourceInput'];
              if (input.mode === 'external' && s.clientKind !== 'human')
                throw new Fault(
                  403,
                  'SITE_CREDENTIAL_FORM_REQUIRED',
                  '请在站点数据源表单中配置数据库口令，口令不会发送给 AI。',
                );
              if (input.mode === 'external') input = await port.authorizeDataSource(s, input);
              result = await invoke('/configure', {
                ...scope,
                input,
                mutationId: req.headers['idempotency-key'],
              });
            } else if (path.endsWith('/inspect'))
              result = await invoke('/inspect', {
                ...scope,
                key: (req.body as S['SiteDataSourceInspect']).key,
              });
            else if (method === 'GET')
              result = { items: worker ? await invoke('/status', scope) : [], enabled: !!worker };
            else {
              const body = req.body as S['SiteRuntimeActivate'],
                built = await db.tenant(s.organizationId, async (tx) => {
                  const current = await identity.subject(tx, s, s.organizationId);
                  return port.artifact(tx, current, appId, body.versionId);
                });
              const status = await invoke<SiteRuntimeStatus>('/deploy', {
                ...scope,
                versionId: body.versionId,
                buildId: built.buildId,
                artifact: built.artifact,
              });
              if (path.endsWith('/activate')) {
                if (status.status !== 'ready')
                  throw new Fault(
                    409,
                    'SITE_HEALTH_CHECK_FAILED',
                    '站点后端启动失败，当前分享版本没有变更。',
                  );
                result = await db.tenant(s.organizationId, async (tx) => {
                  const current = await identity.subject(tx, s, s.organizationId);
                  return port.activate(tx, current, appId, body.versionId, body.expectedRevision);
                });
                await invoke('/promote', { ...scope, versionId: body.versionId });
              } else result = status;
            }
            if (method === 'POST')
              await audit(s, appId, op.operationId, req, {
                ...(req.body && 'versionId' in (req.body as object)
                  ? { versionId: (req.body as S['SiteRuntimeDeploy']).versionId }
                  : {}),
              });
            return reply.send(result);
          } catch (e) {
            const f =
              e instanceof Fault
                ? e
                : new Fault(503, 'SITE_OPERATION_FAILED', '站点操作失败，请查看后端运行日志。');
            return reply.code(f.status).send({
              error: { code: f.code, message: f.safeMessage, requestId: req.id },
              traceId: randomUUID(),
            });
          }
        },
      });
    async function proxy(
      req: FastifyRequest,
      reply: import('fastify').FastifyReply,
      legacy = false,
    ) {
      reply.header('Cache-Control', 'no-store');
      try {
        const appId = (req.params as { appId: string }).appId;
        if (!uuid.test(appId)) throw new Fault(400, 'VALIDATION_ERROR');
        const raw = req.body as Record<string, unknown>;
        let body: S['SiteProxyRequest'];
        if (legacy) {
          if (
            !raw ||
            typeof raw['versionId'] !== 'string' ||
            typeof raw['action'] !== 'string' ||
            !raw['payload'] ||
            Object.keys(raw).some((k) => !['versionId', 'action', 'payload'].includes(k))
          )
            throw new Fault(400, 'VALIDATION_ERROR');
          body = { versionId: raw['versionId'], method: 'POST', path: '/actions', body: raw };
        } else {
          contract.body(
            requireValue(contract.spec.paths['/site-apps/{appId}/request']?.['post']),
            raw,
          );
          body = raw as unknown as S['SiteProxyRequest'];
        }
        if (!uuid.test(body.versionId)) throw new Fault(400, 'VALIDATION_ERROR');
        const resolved = await db.global.one<{ organization_id: string | null }>(
          'SELECT eas_public_app_organization($1) organization_id',
          [appId],
        );
        let org = resolved?.organization_id;
        // Public access must be bound to the current public share, including its exact immutable version.
        if (!org) {
          const actor = await identity.authenticate(req),
            header = req.headers['x-organization-id'];
          if (typeof header !== 'string' || !uuid.test(header))
            throw new Fault(401, 'UNAUTHENTICATED');
          org = header;
          await db.tenant(org, async (tx) => {
            const s = await identity.subject(tx, actor, org!);
            await port.preview(tx, s, appId, body.versionId);
          });
        } else {
          const publicVersion = await db.tenant(org, (tx) =>
            tx.one(
              "SELECT r.app_version_id FROM site_share_heads h JOIN site_share_revisions r ON r.organization_id=h.organization_id AND r.id=h.share_revision_id WHERE h.organization_id=$1 AND h.app_id=$2 AND r.visibility='public' AND r.app_version_id=$3",
              [org, appId, body.versionId],
            ),
          );
          if (!publicVersion) {
            const actor = await identity.authenticate(req);
            await db.tenant(org, async (tx) =>
              port.preview(tx, await identity.subject(tx, actor, org!), appId, body.versionId),
            );
          }
        }
        const headers: Record<string, string> = legacy
          ? {}
          : Object.fromEntries(
              Object.entries(body.headers ?? {}).filter(
                ([name]) =>
                  ![
                    'cookie',
                    'origin',
                    'host',
                    'referer',
                    'content-length',
                    'connection',
                    'transfer-encoding',
                  ].includes(name.toLowerCase()),
              ),
            );
        if (typeof req.headers.origin === 'string') headers['origin'] = req.headers.origin;
        const prefix = appId.replaceAll('-', '');
        const cookies = (req.headers.cookie ?? '')
          .split(';')
          .map((v) => v.trim())
          .filter(
            (v) =>
              v.startsWith('eas_sc_' + prefix + '=') || v.startsWith('eas_site_' + prefix + '_'),
          );
        if (cookies.length) headers['cookie'] = cookies.join('; ');
        for (const key of ['x-student-csrf', 'x-site-csrf', 'idempotency-key']) {
          const value = legacy ? req.headers[key] : body.headers?.[key];
          if (typeof value === 'string') headers[key] = value;
        }
        if (!headers['idempotency-key'])
          headers['idempotency-key'] =
            typeof req.headers['idempotency-key'] === 'string'
              ? req.headers['idempotency-key']
              : randomUUID();
        const result = await invoke<SiteHttpResult>('/request', {
          organizationId: org,
          appId,
          versionId: body.versionId,
          request: { method: body.method, path: body.path, body: body.body, headers },
        });
        if (result.headers['set-cookie']) reply.header('Set-Cookie', result.headers['set-cookie']);
        delete result.headers['set-cookie'];
        if (legacy) {
          for (const [key, value] of Object.entries(result.headers)) reply.header(key, value);
          return reply.code(result.status).send(result.body);
        }
        return reply.send(result);
      } catch (e) {
        const f =
          e instanceof Fault
            ? e
            : new Fault(503, 'SITE_BACKEND_UNAVAILABLE', '站点后端暂不可用，请查看站点运行日志。');
        return reply
          .code(f.status)
          .send({ error: { code: f.code, message: f.safeMessage, requestId: req.id } });
      }
    }
    app.post('/v1/site-apps/:appId/request', { bodyLimit: 40 * 1024 * 1024 }, (req, reply) =>
      proxy(req, reply),
    );
    app.post('/v1/student-centers/:appId/actions', { bodyLimit: 40 * 1024 * 1024 }, (req, reply) =>
      proxy(req, reply, true),
    );
  }
  async function debugRequest(
    s: Subject,
    appId: string,
    versionId: string,
    request: import('@eas/api-contract').SiteHttpInput,
  ) {
    contract.body(requireValue(contract.spec.paths['/site-apps/{appId}/request']?.['post']), {
      versionId,
      ...request,
    });
    await db.tenant(s.organizationId, async (tx) =>
      port.preview(tx, await identity.subject(tx, s, s.organizationId), appId, versionId),
    );
    return invoke<SiteHttpResult>('/request', {
      organizationId: s.organizationId,
      appId,
      versionId,
      request,
      debugOrigin: true,
    });
  }
  return { registerRoutes, debugRequest };
}
