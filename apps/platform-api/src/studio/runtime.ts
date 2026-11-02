import { StudioDebug } from './debug.js';
import { createSiteRuntime } from '../site-runtime/runtime.js';
import { siteArtifact } from './build-artifact.js';
import { SiteSharing } from './sharing.js';
import { ServerWorkspace } from './workspace.js';
import type { TestAppContext } from './access.js';
import { randomUUID } from 'node:crypto';
import type { FastifyInstance, HTTPMethods } from 'fastify';
import type { components } from '@eas/api-contract';
import type { Database, Sql } from '../infrastructure/database.js';
import type { Identity, Subject } from '../identity/identity.js';
import { Mutations } from '../infrastructure/mutations.js';
import { Fault, requireValue } from '../infrastructure/errors.js';
import type { contractValidation } from '../infrastructure/contract-validation.js';
import type { WorkerTarget } from '../infrastructure/worker-target.js';
import { StudioService, StudioBuilds, type TestQueryPort } from './service.js';
type S = components['schemas'];
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function createStudioRuntime(
  db: Database,
  identity: Identity,
  queries: TestQueryPort,
  contract: Awaited<ReturnType<typeof contractValidation>>,
  worker: WorkerTarget | undefined,
  previewWorker?: WorkerTarget,
  siteWorker?: WorkerTarget,
  authorizeDataSource?: (
    subject: Subject,
    input: import('@eas/api-contract').SiteDataSourceInput,
  ) => Promise<import('@eas/api-contract').SiteDataSourceInput>,
) {
  const service = new StudioService(identity, queries, contract.validate),
    builds = new StudioBuilds(db, service, identity, worker),
    mutations = new Mutations(db, identity);
  const sharing = new SiteSharing(identity, service);
  const workspace = new ServerWorkspace(service),
    debug = new StudioDebug(
      db,
      identity,
      service,
      queries,
      contract,
      previewWorker,
      (subject, appId, versionId, request) =>
        siteRuntime.debugRequest(subject, appId, versionId, request),
    );
  const siteRuntime = createSiteRuntime(
    db,
    identity,
    contract,
    {
      authorizeDataSource: async (s, input) => {
        if (!authorizeDataSource) throw new Fault(503, 'SITE_NETWORK_POLICY_REQUIRED');
        return authorizeDataSource(s, input);
      },
      authorize: async (tx, s, id) => {
        await service.app(tx, s, id, true);
      },
      preview: async (tx, s, id, version) => {
        await service.version(tx, s, id, version);
      },
      artifact: async (tx, s, id, version) => {
        const v = await service.version(tx, s, id, version, true);
        if (!v.manifest.runtime)
          throw new Fault(
            409,
            'SITE_BACKEND_REQUIRED',
            '此版本还没有站点后端，请在项目中添加 server 源码和 runtime 配置。',
          );
        const b = requireValue(
          await tx.one<{ id: string; content: Buffer }>(
            "SELECT j.id,b.content FROM build_jobs j JOIN studio_artifact_blobs b ON b.organization_id=j.organization_id AND b.artifact_id=j.artifact_id WHERE j.organization_id=$1 AND j.app_version_id=$2 AND j.status='succeeded' AND j.preview_only=true ORDER BY j.created_at DESC,j.id DESC LIMIT 1",
            [s.organizationId, version],
          ),
        );
        const artifact = siteArtifact(b.content);
        if (artifact.dataSource !== v.manifest.runtime.dataSource)
          throw new Fault(409, 'SITE_BUILD_DIGEST_MISMATCH');
        return { buildId: b.id, artifact };
      },
      activate: (tx, s, id, version, revision) => sharing.activate(tx, s, id, version, revision),
    },
    siteWorker,
  );
  const release = {
    enabled: true as const,
    code: 'RELEASE_WORKFLOW_ENABLED' as const,
    message: '支持版本冻结、顺序审批、受控发布和重新审批回滚；生产执行服务按部署配置启用。',
  };
  async function registerRoutes(app: FastifyInstance) {
    app.get('/v1/public/site-shares/:shareId', async (req, reply) => {
      const trace = randomUUID();
      reply.header('Cache-Control', 'no-store');
      try {
        const id = (req.params as { shareId: string }).shareId;
        if (!uuid.test(id) || Object.keys(req.query as object).length)
          throw new Fault(400, 'VALIDATION_ERROR');
        const resolved = await db.global.one<{ organization_id: string | null }>(
          'SELECT eas_public_site_organization($1) organization_id',
          [id],
        );
        if (!resolved?.organization_id) throw new Fault(404, 'NOT_FOUND', '此站点未对外公开。');
        return reply.send(
          await db.tenant(resolved.organization_id, (tx) =>
            sharing.openPublic(tx, resolved.organization_id!, id),
          ),
        );
      } catch (e) {
        const f =
          e instanceof Fault
            ? e
            : new Fault(503, 'DEPENDENCY_UNAVAILABLE', '站点服务暂时不可用，请稍后重试。');
        return reply.code(f.status).send({
          error: { code: f.code, message: f.safeMessage, requestId: req.id },
          traceId: trace,
        });
      }
    });
    await siteRuntime.registerRoutes(app);
    await debug.registerRoutes(app);
    type C = { tx: Sql; s: Subject; p: Record<string, string>; body: unknown; trace: string };
    function route(
      method: HTTPMethods,
      path: string,
      fn: (c: C) => Promise<unknown> | unknown,
      status = 200,
    ) {
      const op = requireValue(contract.spec.paths[path]?.[method.toLowerCase()]);
      app.route({
        method,
        url: '/v1' + path.replaceAll(/\{(\w+)\}/g, ':$1'),
        handler: async (req, reply) => {
          reply.header('Cache-Control', 'no-store');
          const trace = randomUUID();
          try {
            const actor = await identity.authenticate(req),
              org = req.headers['x-organization-id'],
              p = req.params as Record<string, string>;
            if (
              typeof org !== 'string' ||
              !uuid.test(org) ||
              Object.values(p).some((v) => !uuid.test(v)) ||
              Object.keys(req.query as object).some((k) => k !== 'pageSize') ||
              ('pageSize' in (req.query as object) &&
                String((req.query as Record<string, string>)['pageSize']) !== '100')
            )
              throw new Fault(400, 'VALIDATION_ERROR');
            contract.body(op, req.body);
            const authorize = async (tx: Sql, s: Subject) => {
              if (p['shareId']) await sharing.check(tx, s, p['shareId']);
              if (path === '/apps/{appId}/sharing' && method !== 'GET')
                await sharing.manage(tx, s, p['appId']!);
              if (p['appId']) await service.app(tx, s, p['appId'], method !== 'GET');
              if (p['reportId']) await service.report(tx, s, p['reportId'], method !== 'GET');
              if (p['appVersionId']) {
                const row = requireValue(
                  await tx.one<{ app_id: string; manifest: S['SourceManifest'] }>(
                    'SELECT app_id,manifest FROM app_versions WHERE organization_id=$1 AND id=$2',
                    [org, p['appVersionId']],
                  ),
                );
                if (p['appId'] && p['appId'] !== row.app_id) throw new Fault(404, 'NOT_FOUND');
                await service.app(tx, s, row.app_id, method !== 'GET');
                if (method === 'GET' && path === '/apps/{appId}/versions/{appVersionId}')
                  await service.inspectManifest(tx, s, row.manifest);
                else await service.validateManifest(tx, s, row.manifest);
              }
              const b = req.body as
                | {
                    manifest?: S['SourceManifest'];
                    config?: S['ReportDefinition'];
                    datasetRefs?: S['DatasetRef'][];
                  }
                | undefined;
              if (b?.manifest) await service.validateManifest(tx, s, b.manifest);
              if (b?.config) await service.validateReport(tx, s, b.config);
              if (b?.datasetRefs) await service.checkRefs(tx, s, b.datasetRefs);
              if (path.endsWith('/restore')) {
                const old = (req.body as S['RestoreVersion']).versionId;
                if (p['appId']) await service.authorizeRestore(tx, s, p['appId'], old);
                if (p['reportId']) await service.authorizeReportRestore(tx, s, p['reportId'], old);
              }
            };
            let body: unknown;
            if (method === 'GET')
              body = await db.tenant(org, async (tx) => {
                const s = await identity.subject(tx, actor, org);
                identity.require(s, op['x-permissions']?.[0] ?? 'session.read');
                await authorize(tx, s);
                return fn({ tx, s, p, body: req.body, trace });
              });
            else {
              const r = await mutations.run(
                req,
                actor,
                org,
                op.operationId,
                op['x-permissions']?.[0] ?? 'session.read',
                false,
                async (tx, s) => ({ body: await fn({ tx, s, p, body: req.body, trace }), status }),
                authorize,
              );
              body = r.body;
            }
            return reply.code(status).send(body);
          } catch (e) {
            const code = (e as { code?: string }).code,
              f =
                e instanceof Fault
                  ? e
                  : code === '23505'
                    ? new Fault(409, 'STATE_CONFLICT')
                    : ['23514', '23503'].includes(code ?? '')
                      ? new Fault(422, 'VALIDATION_ERROR')
                      : new Fault(503, 'DEPENDENCY_UNAVAILABLE');
            if (path.endsWith('/queries')) {
              try {
                const actor = await identity.authenticate(req),
                  org = req.headers['x-organization-id'],
                  p = req.params as Record<string, string>;
                if (typeof org === 'string' && uuid.test(org))
                  await db.tenant(org, async (tx) => {
                    const appId =
                      p['appId'] ??
                      (p['shareId'] && uuid.test(p['shareId'])
                        ? await sharing.auditTarget(tx, org, p['shareId'])
                        : undefined);
                    if (appId && uuid.test(appId))
                      await queries.auditDenied(
                        tx,
                        { ...actor, organizationId: org, actions: new Set() },
                        appId,
                        trace,
                        f.code,
                      );
                  });
              } catch {}
            }
            return reply.code(f.status).send({
              error: {
                code: f.code,
                message: f.safeMessage,
                ...(f.details.length ? { details: f.details } : {}),
                requestId: req.id,
              },
              traceId: trace,
            });
          }
        },
      });
    }
    route('GET', '/studio/capabilities', () => ({
      sourceUpload: true,
      serverWorkspace: true,
      remoteDebug: !!previewWorker,
      buildProfile: 'react-static-v1',
      siteBackend: !!siteWorker,
      buildProfiles: ['react-static-v1', 'site-fullstack-v1'],
      productionEnabled: true,
      releaseEnabled: true,
      modelGeneration: 'harness',
      maxSourceBytes: 4 * 1024 * 1024,
    }));
    route('GET', '/studio/release-status', () => release);
    route('GET', '/apps', (c) => service.list(c.tx, c.s));
    route('POST', '/apps', (c) => service.create(c.tx, c.s, c.body as S['StudioAppCreate']), 201);
    route('GET', '/apps/{appId}', (c) => service.get(c.tx, c.s, c.p['appId']!));
    route('GET', '/apps/{appId}/versions', (c) => service.versions(c.tx, c.s, c.p['appId']!));
    route(
      'POST',
      '/apps/{appId}/versions',
      (c) => service.upload(c.tx, c.s, c.p['appId']!, c.body as S['SourceUpload']),
      201,
    );
    route('GET', '/apps/{appId}/workspace', (c) => workspace.list(c.tx, c.s, c.p['appId']!));
    route('POST', '/apps/{appId}/workspace/read', (c) =>
      workspace.read(c.tx, c.s, c.p['appId']!, (c.body as S['ReadServerWorkspaceFile']).path),
    );
    route('POST', '/apps/{appId}/workspace/write', (c) =>
      workspace.write(c.tx, c.s, c.p['appId']!, c.body as S['WriteServerWorkspace']),
    );
    route('POST', '/apps/{appId}/workspace/edit', (c) =>
      workspace.edit(c.tx, c.s, c.p['appId']!, c.body as S['EditServerWorkspace']),
    );
    route('POST', '/apps/{appId}/workspace/remove', (c) =>
      workspace.remove(c.tx, c.s, c.p['appId']!, c.body as S['RemoveServerWorkspaceFiles']),
    );
    route('POST', '/apps/{appId}/workspace/move', (c) =>
      workspace.move(c.tx, c.s, c.p['appId']!, c.body as S['MoveServerWorkspaceFile']),
    );
    route('POST', '/apps/{appId}/workspace/checkout', (c) =>
      workspace.checkout(c.tx, c.s, c.p['appId']!, c.body as S['CheckoutServerWorkspace']),
    );
    route('POST', '/apps/{appId}/workspace/commit', (c) =>
      workspace.commit(c.tx, c.s, c.p['appId']!, c.body as S['CommitServerWorkspace']),
    );
    route('GET', '/apps/{appId}/versions/{appVersionId}', (c) =>
      service.getVersion(c.tx, c.s, c.p['appId']!, c.p['appVersionId']!),
    );
    route(
      'POST',
      '/apps/{appId}/restore',
      (c) => service.restore(c.tx, c.s, c.p['appId']!, c.body as S['RestoreVersion']),
      201,
    );
    route(
      'POST',
      '/app-versions/{appVersionId}/builds',
      (c) => service.build(c.tx, c.s, c.p['appVersionId']!, !!worker),
      202,
    );
    route('GET', '/build-jobs/{buildJobId}', (c) =>
      service.getBuild(c.tx, c.s, c.p['buildJobId']!),
    );
    route('GET', '/apps/{appId}/preview/{appVersionId}', (c) =>
      service.preview(c.tx, c.s, c.p['appId']!, c.p['appVersionId']!),
    );
    route(
      'POST',
      '/apps/{appId}/preview/{appVersionId}/queries',
      (c) =>
        service.query(
          c.tx,
          c.s,
          c.p['appId']!,
          c.p['appVersionId']!,
          c.body as S['StudioQuery'],
          c.trace,
        ),
      202,
    );
    route('GET', '/apps/{appId}/sharing', (c) => sharing.settings(c.tx, c.s, c.p['appId']!));
    route('POST', '/apps/{appId}/sharing', (c) =>
      sharing.update(c.tx, c.s, c.p['appId']!, c.body as S['UpdateSiteSharing']),
    );
    route('GET', '/site-shares/{shareId}', (c) => sharing.open(c.tx, c.s, c.p['shareId']!));
    route(
      'POST',
      '/site-shares/{shareId}/queries',
      (c) => sharing.query(c.tx, c.s, c.p['shareId']!, c.body as S['StudioQuery'], c.trace),
      202,
    );
    route('GET', '/reports', (c) => service.listReports(c.tx, c.s));
    route(
      'POST',
      '/reports',
      (c) => service.createReport(c.tx, c.s, c.body as S['StudioReportCreate']),
      201,
    );
    route('GET', '/reports/{reportId}', async (c) => {
      const r = await service.report(c.tx, c.s, c.p['reportId']!);
      return { id: r.id, appId: r.app_id, key: r.key, name: r.name, revision: Number(r.revision) };
    });
    route('GET', '/reports/{reportId}/versions', (c) =>
      service.reportVersions(c.tx, c.s, c.p['reportId']!),
    );
    route(
      'POST',
      '/reports/{reportId}/versions',
      (c) =>
        service.saveReport(c.tx, c.s, c.p['reportId']!, (c.body as S['SaveReportVersion']).config),
      201,
    );
    route(
      'POST',
      '/reports/{reportId}/restore',
      (c) => service.restoreReport(c.tx, c.s, c.p['reportId']!, c.body as S['RestoreVersion']),
      201,
    );
  }
  return {
    releasePort: {
      apps: (tx: Sql, s: Subject) => service.releaseApps(tx, s),
      freeze: (tx: Sql, s: Subject, v: string, b: string) => service.freezeRelease(tx, s, v, b),
    },
    registerRoutes,
    start: () => {
      builds.start();
      debug.start();
    },
    close: async () => {
      await debug.close();
      await builds.close();
    },
    access: {
      async checkTestVersion(tx: Sql, s: Subject, c: TestAppContext) {
        if (c.share) await sharing.check(tx, s, c.share.id, c);
        else await service.version(tx, s, c.appId, c.versionId);
      },
    },
  };
}
