import { randomUUID } from 'node:crypto';
import type { FastifyInstance, HTTPMethods } from 'fastify';
import type { components, SiteHttpInput, SiteHttpResult } from '@eas/api-contract';
import { signedRequest } from '@eas/connector-transport';
import type { Database, Sql } from '../infrastructure/database.js';
import type { Actor, Identity, Subject } from '../identity/identity.js';
import type { WorkerTarget } from '../infrastructure/worker-target.js';
import type { contractValidation } from '../infrastructure/contract-validation.js';
import { Mutations } from '../infrastructure/mutations.js';
import { Fault, requireValue } from '../infrastructure/errors.js';
import type { StudioService, TestQueryPort } from './service.js';
type S = components['schemas'];
interface Entry {
  dto: S['StudioDebugSession'];
  organizationId: string;
  actor: Actor;
  traceId: string;
  lastUsed: number;
  after: number;
  nextAuthorization: number;
  pumping: boolean;
  queries: Map<string, { jobId: string; key: string; started: number }>;
  seen: Set<string>;
  actions: Set<string>;
  tasks: Set<Promise<unknown>>;
  actionTail: Promise<void>;
  siteCookies: Map<string, string>;
}
interface WorkerEvents {
  events: S['StudioDebugEvent'][];
  queries: { id: string; input: S['StudioQuery'] }[];
  requests?: { id: string; input: SiteHttpInput }[];
}
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
/** Ephemeral browser sessions. Source versions and existing query/audit records remain durable. */
export class StudioDebug {
  private readonly sessions = new Map<string, Entry>();
  private readonly mutations: Mutations;
  private timer: ReturnType<typeof setInterval> | undefined;
  private stopped = false;
  constructor(
    private readonly db: Database,
    private readonly identity: Identity,
    private readonly studio: StudioService,
    private readonly queries: TestQueryPort,
    private readonly contract: Awaited<ReturnType<typeof contractValidation>>,
    private readonly worker: WorkerTarget | undefined,
    private readonly siteBackend?: (
      subject: Subject,
      appId: string,
      versionId: string,
      request: SiteHttpInput,
    ) => Promise<SiteHttpResult>,
  ) {
    this.mutations = new Mutations(db, identity);
  }
  private event(
    entry: Entry,
    type: S['StudioDebugEvent']['type'],
    level: string,
    message: string,
    extra: Partial<S['StudioDebugEvent']> = {},
  ) {
    entry.dto.events.push({
      sequence: entry.dto.events.length + 1,
      timestamp: new Date().toISOString(),
      type,
      level,
      message,
      ...extra,
    });
  }
  private async call<T>(path: string, body: object): Promise<T> {
    if (!this.worker)
      throw new Fault(
        503,
        'DEBUG_WORKER_UNAVAILABLE',
        '远程浏览器服务未启动，请启动 preview-worker 并配置 PREVIEW_WORKER_URL。',
      );
    const w = this.worker;
    let response: { ok: boolean; data: T; code?: string; message?: string };
    try {
      response = await signedRequest(new URL(path, w.url), w.key, body, {
        tls: w.tls,
        allowLocalHttp: w.allowLocalHttp,
        timeoutMs: 60000,
        maxResponseBytes: 33554432,
      });
    } catch {
      throw new Fault(
        503,
        'DEBUG_WORKER_UNAVAILABLE',
        '无法连接远程浏览器服务，请检查 preview-worker 进程和连接配置。',
      );
    }
    if (!response.ok)
      throw new Fault(
        422,
        response.code ?? 'DEBUG_BROWSER_OPERATION_FAILED',
        response.message ?? '浏览器操作失败。',
      );
    return response.data;
  }
  private entry(id: string, organizationId: string, actor: Actor) {
    const entry = this.sessions.get(id);
    if (!entry || entry.organizationId !== organizationId || entry.actor.userId !== actor.userId)
      throw new Fault(
        404,
        'DEBUG_SESSION_NOT_FOUND',
        '该远程调试会话不存在或已经结束；请为应用版本重新打开调试会话。',
      );
    entry.lastUsed = Date.now();
    return entry;
  }
  private async authorize(tx: Sql, s: Subject, entry: Entry, datasets = true) {
    this.identity.require(s, 'app.develop');
    const version = await this.studio.version(tx, s, entry.dto.appId, entry.dto.versionId, true);
    if (datasets) await this.studio.validateManifest(tx, s, version.manifest);
  }
  private async current<T>(
    entry: Entry,
    fn: (tx: Sql, s: Subject) => Promise<T>,
    datasets = false,
  ) {
    return this.db.tenant(entry.organizationId, async (tx) => {
      const s = await this.identity.subject(tx, entry.actor, entry.organizationId);
      await this.authorize(tx, s, entry, datasets);
      return fn(tx, s);
    });
  }
  private track(entry: Entry, task: Promise<unknown>) {
    entry.tasks.add(task);
    void task.finally(() => entry.tasks.delete(task)).catch(() => {});
  }
  private view(entry: Entry): S['StudioDebugSession'] {
    return {
      ...entry.dto,
      pendingQueries: entry.queries.size,
      pendingActions: entry.dto.pendingActions,
    };
  }
  private startSession(
    id: string,
    organizationId: string,
    actor: Actor,
    input: S['StudioDebugOpen'],
    snapshot: S['StudioPreview'],
    trace: string,
  ) {
    if (this.sessions.has(id)) return this.sessions.get(id)!;
    const entry: Entry = {
      dto: {
        id,
        appId: snapshot.appId,
        versionId: snapshot.versionId,
        buildId: snapshot.buildId,
        environment: 'test',
        status: 'starting',
        createdAt: new Date().toISOString(),
        viewport: input.viewport ?? { width: 1440, height: 900 },
        events: [],
        pendingQueries: 0,
        pendingActions: 0,
      },
      organizationId,
      actor,
      traceId: trace,
      lastUsed: Date.now(),
      after: 0,
      nextAuthorization: 0,
      pumping: false,
      queries: new Map(),
      seen: new Set(),
      actions: new Set(),
      tasks: new Set(),
      actionTail: Promise.resolve(),
      siteCookies: new Map(),
    };
    this.sessions.set(id, entry);
    this.track(
      entry,
      this.call('/open', { id, preview: snapshot, viewport: entry.dto.viewport })
        .then(() => {
          if (entry.dto.status === 'starting') entry.dto.status = 'ready';
        })
        .catch((error) => {
          entry.dto.status = 'failed';
          entry.dto.failureCode = error instanceof Fault ? error.code : 'DEBUG_FAILED';
          this.event(
            entry,
            'lifecycle',
            'error',
            error instanceof Fault ? error.safeMessage : '远程浏览器启动失败。',
          );
        }),
    );
    return entry;
  }
  private async deliver(entry: Entry, id: string, response: object) {
    if (entry.dto.status === 'ready')
      await this.call('/resolve', { id: entry.dto.id, queryId: id, response });
  }
  private failure(error: unknown, entry: Entry, key: string) {
    const f =
      error instanceof Fault
        ? error
        : new Fault(503, 'QUERY_FAILED', '测试查询失败，请查看查询服务状态。');
    return {
      error: f.code,
      diagnostic: {
        code: f.code,
        message: f.safeMessage,
        status: f.status,
        operation: '查询 ' + key,
        action: '根据错误详情修正源码或查询绑定后重试。',
        traceId: entry.traceId,
        ...(f.details.length ? { details: f.details } : {}),
      },
    };
  }
  private async pump(entry: Entry) {
    if (entry.pumping || entry.dto.status !== 'ready') return;
    entry.pumping = true;
    try {
      if (Date.now() >= entry.nextAuthorization) {
        await this.current(entry, async () => {}, true);
        entry.nextAuthorization = Date.now() + 5000;
      }
      const observations = await this.call<WorkerEvents>('/events', {
        id: entry.dto.id,
        after: entry.after,
      });
      for (const item of observations.events) {
        entry.after = Math.max(entry.after, item.sequence);
        const { sequence: _sequence, ...rest } = item;
        this.event(entry, rest.type, rest.level, rest.message, rest);
      }
      for (const request of observations.requests ?? []) {
        if (entry.seen.has(request.id)) continue;
        entry.seen.add(request.id);
        try {
          if (!this.siteBackend) throw new Fault(503, 'SITE_BACKEND_UNAVAILABLE');
          const subject = await this.current(entry, async (_tx, s) => s);
          const response = await this.siteBackend(subject, entry.dto.appId, entry.dto.versionId, {
            ...request.input,
            headers: {
              ...request.input.headers,
              'idempotency-key': request.id,
              ...(entry.siteCookies.size
                ? { cookie: [...entry.siteCookies.values()].join('; ') }
                : {}),
            },
          });
          const cookies = response.headers['set-cookie'];
          for (const cookie of typeof cookies === 'string' ? [cookies] : (cookies ?? [])) {
            const pair = cookie.split(';')[0]!,
              name = pair.split('=')[0]!;
            entry.siteCookies.set(name, pair);
          }
          delete response.headers['set-cookie'];
          await this.deliver(entry, request.id, { response });
          this.event(
            entry,
            'console',
            response.status < 400 ? 'info' : 'error',
            '站点后端 ' +
              request.input.method +
              ' ' +
              request.input.path +
              ' · HTTP ' +
              response.status,
          );
        } catch (e) {
          await this.deliver(entry, request.id, {
            error: 'SITE_BACKEND_UNAVAILABLE',
            message: e instanceof Fault ? e.safeMessage : '站点后端请求失败，请查看后端日志。',
          });
        }
      }
      const pending = new Set(observations.queries.map((q) => q.id));
      for (const [id, job] of entry.queries)
        if (!pending.has(id)) {
          await this.current(entry, (tx, s) => this.queries.cancel(tx, s, job.jobId)).catch(
            () => {},
          );
          entry.queries.delete(id);
        }
      for (const request of observations.queries) {
        if (entry.seen.has(request.id)) continue;
        entry.seen.add(request.id);
        try {
          if (!this.contract.validate('StudioQuery', request.input))
            throw new Fault(400, 'VALIDATION_ERROR', '页面发出的查询参数不符合 StudioQuery 契约。');
          const job = (await this.current(entry, (tx, s) =>
            this.studio.query(
              tx,
              s,
              entry.dto.appId,
              entry.dto.versionId,
              request.input,
              entry.traceId,
            ),
          )) as S['QueryJob'];
          entry.queries.set(request.id, {
            jobId: job.id,
            key: request.input.queryKey,
            started: Date.now(),
          });
          this.event(
            entry,
            'query',
            'info',
            '查询 ' +
              request.input.queryKey +
              ' 已提交 · jobId=' +
              job.id +
              ' · traceId=' +
              job.traceId,
          );
        } catch (error) {
          const failure = this.failure(error, entry, request.input.queryKey);
          this.event(entry, 'query', 'error', JSON.stringify(failure.diagnostic));
          await this.deliver(entry, request.id, failure);
        }
      }
      for (const [id, pendingJob] of entry.queries) {
        try {
          const job = await this.current(entry, (tx, s) =>
            this.queries.read(tx, s, pendingJob.jobId),
          );
          if (!['succeeded', 'failed', 'cancelled'].includes(job.status)) continue;
          entry.queries.delete(id);
          if (job.status === 'succeeded' && job.result) {
            await this.deliver(entry, id, { result: job.result });
            this.event(
              entry,
              'query',
              'info',
              '查询 ' +
                pendingJob.key +
                ' 成功 · ' +
                job.rowCount +
                ' 行 · ' +
                (Date.now() - pendingJob.started) +
                ' ms · traceId=' +
                job.traceId,
            );
          } else {
            const failure = this.failure(
              new Fault(
                422,
                job.failureCode ?? 'QUERY_FAILED',
                '查询 ' + pendingJob.key + ' 未完成，错误码：' + (job.failureCode ?? job.status),
              ),
              entry,
              pendingJob.key,
            );
            failure.diagnostic.traceId = job.traceId;
            await this.deliver(entry, id, failure);
            this.event(entry, 'query', 'error', JSON.stringify(failure.diagnostic));
          }
        } catch (error) {
          entry.queries.delete(id);
          const failure = this.failure(error, entry, pendingJob.key);
          await this.deliver(entry, id, failure);
          this.event(entry, 'query', 'error', JSON.stringify(failure.diagnostic));
        }
      }
    } catch (error) {
      entry.dto.status = 'failed';
      entry.dto.failureCode = error instanceof Fault ? error.code : 'DEBUG_FAILED';
      this.event(
        entry,
        'lifecycle',
        'error',
        error instanceof Fault ? error.safeMessage : '调试数据同步失败。',
      );
      await this.call('/close', { id: entry.dto.id }).catch(() => {});
    } finally {
      entry.pumping = false;
    }
  }
  private queueAction(entry: Entry, id: string, input: S['StudioDebugAction']) {
    if (entry.actions.has(id)) return;
    entry.actions.add(id);
    entry.dto.pendingActions++;
    entry.actionTail = entry.actionTail.then(async () => {
      try {
        if (entry.dto.status !== 'ready') return;
        await this.current(entry, async () => {}, true);
        const observation = await this.call<Record<string, unknown>>('/action', {
          id: entry.dto.id,
          action: input,
        });
        if (entry.dto.status !== 'ready') return;
        entry.dto.observation = observation;
        if (input.type === 'resize')
          entry.dto.viewport = { width: input.width, height: input.height };
        this.event(entry, 'action', 'info', input.type + ' 已完成 · actionId=' + id);
      } catch (error) {
        this.event(
          entry,
          'action',
          'error',
          input.type +
            ' 失败：' +
            (error instanceof Fault ? error.safeMessage : '浏览器操作失败。'),
        );
      } finally {
        entry.dto.pendingActions--;
      }
    });
    this.track(entry, entry.actionTail);
  }
  start() {
    this.timer = setInterval(() => {
      for (const entry of this.sessions.values()) {
        if (
          ['closed', 'failed'].includes(entry.dto.status) &&
          Date.now() - entry.lastUsed > 1800000
        )
          this.sessions.delete(entry.dto.id);
        else if (!this.stopped) this.track(entry, this.pump(entry));
      }
    }, 250);
    this.timer.unref();
  }
  async close() {
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
    await Promise.all([...this.sessions.values()].flatMap((entry) => [...entry.tasks]));
    await Promise.all(
      [...this.sessions.keys()].map((id) => this.call('/close', { id }).catch(() => {})),
    );
    this.sessions.clear();
  }
  async registerRoutes(app: FastifyInstance) {
    const register = (method: HTTPMethods, path: string) => {
      const operation = requireValue(this.contract.spec.paths[path]?.[method.toLowerCase()]);
      app.route({
        method,
        url: '/v1' + path.replaceAll(/\{(\w+)\}/g, ':$1'),
        handler: async (req, reply) => {
          reply.header('Cache-Control', 'no-store');
          const trace = randomUUID();
          try {
            const actor = await this.identity.authenticate(req),
              org = req.headers['x-organization-id'],
              params = req.params as Record<string, string>,
              query = req.query as Record<string, string>;
            if (
              typeof org !== 'string' ||
              !uuid.test(org) ||
              Object.values(params).some((value) => !uuid.test(value)) ||
              Object.keys(query).some((key) => !['fullPage', 'selector'].includes(key)) ||
              (query['fullPage'] !== undefined && !['true', 'false'].includes(query['fullPage']))
            )
              throw new Fault(400, 'VALIDATION_ERROR');
            this.contract.body(operation, req.body);
            const opening = path === '/apps/{appId}/debug-sessions',
              entry = opening ? undefined : this.entry(params['debugSessionId']!, org, actor);
            const authorize = async (tx: Sql, s: Subject) => {
              this.identity.require(s, 'app.develop');
              if (entry) await this.authorize(tx, s, entry);
              else
                await this.studio.version(
                  tx,
                  s,
                  params['appId']!,
                  (req.body as S['StudioDebugOpen']).versionId,
                  true,
                );
            };
            if (method === 'GET') {
              await this.db.tenant(org, async (tx) =>
                authorize(tx, await this.identity.subject(tx, actor, org)),
              );
              await this.pump(entry!);
              if (path.endsWith('/screenshot')) {
                if (entry!.dto.status !== 'ready')
                  throw new Fault(
                    409,
                    'DEBUG_NOT_READY',
                    '远程浏览器尚未就绪或已经关闭，请读取调试状态。',
                  );
                const image = await this.call<
                  Omit<
                    S['StudioDebugScreenshot'],
                    'sessionId' | 'appId' | 'versionId' | 'pendingQueries'
                  >
                >('/screenshot', {
                  id: entry!.dto.id,
                  fullPage: query['fullPage'] !== 'false',
                  ...(query['selector'] ? { selector: query['selector'] } : {}),
                });
                await this.current(entry!, async () => {}, true);
                return reply.send({
                  ...image,
                  sessionId: entry!.dto.id,
                  appId: entry!.dto.appId,
                  versionId: entry!.dto.versionId,
                  pendingQueries: entry!.queries.size,
                });
              }
              return reply.send(this.view(entry!));
            }
            const status = path.endsWith('/close') ? 200 : 202;
            const result = await this.mutations.run(
              req,
              actor,
              org,
              operation.operationId,
              'app.develop',
              false,
              async (tx, s) => {
                if (opening) {
                  if (!this.worker)
                    throw new Fault(
                      503,
                      'DEBUG_WORKER_UNAVAILABLE',
                      '远程浏览器服务未配置，请启动 preview-worker。',
                    );
                  const preview = await this.studio.preview(
                    tx,
                    s,
                    params['appId']!,
                    (req.body as S['StudioDebugOpen']).versionId,
                  );
                  return {
                    status,
                    body: {
                      id: randomUUID(),
                      appId: preview.appId,
                      versionId: preview.versionId,
                      buildId: preview.buildId,
                    },
                  };
                }
                if (entry!.dto.status !== 'ready' && !path.endsWith('/close'))
                  throw new Fault(
                    409,
                    'DEBUG_NOT_READY',
                    '调试会话尚未就绪，请等待状态 ready 后再操作。',
                  );
                return { status, body: { id: entry!.dto.id, actionId: randomUUID() } };
              },
              authorize,
            );
            const value = result.body as { id: string; actionId?: string };
            if (opening) {
              const input = req.body as S['StudioDebugOpen'];
              const preview = await this.db.tenant(org, async (tx) =>
                this.studio.preview(
                  tx,
                  await this.identity.subject(tx, actor, org),
                  params['appId']!,
                  input.versionId,
                ),
              );
              return reply
                .code(status)
                .send(this.view(this.startSession(value.id, org, actor, input, preview, trace)));
            }
            if (path.endsWith('/close')) {
              entry!.dto.status = 'closed';
              for (const job of entry!.queries.values())
                await this.current(entry!, (tx, s) => this.queries.cancel(tx, s, job.jobId)).catch(
                  () => {},
                );
              entry!.queries.clear();
              await this.call('/close', { id: entry!.dto.id });
              this.event(entry!, 'lifecycle', 'info', '远程调试会话已关闭。');
            } else this.queueAction(entry!, value.actionId!, req.body as S['StudioDebugAction']);
            return reply.code(status).send(this.view(entry!));
          } catch (error) {
            const fault =
              error instanceof Fault
                ? error
                : new Fault(503, 'DEBUG_FAILED', '远程调试请求失败，请查看浏览器服务状态。');
            return reply.code(fault.status).send({
              error: {
                code: fault.code,
                message: fault.safeMessage,
                details: fault.details,
                requestId: req.id,
              },
              traceId: trace,
            });
          }
        },
      });
    };
    register('POST', '/apps/{appId}/debug-sessions');
    register('GET', '/debug-sessions/{debugSessionId}');
    register('POST', '/debug-sessions/{debugSessionId}/actions');
    register('GET', '/debug-sessions/{debugSessionId}/screenshot');
    register('POST', '/debug-sessions/{debugSessionId}/close');
  }
}
