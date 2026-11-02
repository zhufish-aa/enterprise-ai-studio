import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import {
  createEnterpriseMcpHttp,
  platformResponseError,
  type McpPlatformPort,
  type PlatformRequest,
} from '@eas/mcp-server';
import { Database } from '../infrastructure/database.js';
import { Identity } from '../identity/identity.js';
import { Fault } from '../infrastructure/errors.js';

/** MCP is another face of this API, using the caller's platform PAT, never a service/admin token. */
export function createMcpRuntime(
  db: Database,
  identity: Identity,
  origins: readonly string[],
  log: (record: Record<string, unknown>) => void,
) {
  const trusted = new Map(
    origins.map((value) => {
      const url = new URL(value);
      return [url.host, url.origin];
    }),
  );
  const active = new Set<ReturnType<typeof createEnterpriseMcpHttp>>();
  function registerRoutes(fastify: FastifyInstance) {
    fastify.route({
      method: ['GET', 'POST', 'DELETE'],
      url: '/mcp',
      bodyLimit: 33_554_432,
      handler: async (req, reply) => {
        try {
          const portalUrl = trusted.get(req.headers.host ?? '');
          if (!portalUrl)
            throw new Fault(
              403,
              'MCP_HOST_REJECTED',
              'MCP 地址与平台服务器配置不一致，请使用企业平台的正式地址连接。',
            );
          const origin = req.headers.origin;
          if (origin !== undefined && !origins.includes(origin))
            throw new Fault(
              403,
              'MCP_ORIGIN_REJECTED',
              '此网页来源未获准连接企业平台 MCP。请在 AI 客户端中配置服务器地址。',
            );
          const authorization = req.headers.authorization;
          if (typeof authorization !== 'string' || !authorization.startsWith('Bearer eas_pat_'))
            throw new Fault(
              401,
              'MCP_TOKEN_REQUIRED',
              '请在请求头 Authorization 中填写 Bearer 加个人访问令牌；在网页端“个人访问令牌”中创建。',
            );
          const actor = await identity.authenticate(req),
            organizationId = actor.personalToken?.organizationId;
          if (!organizationId)
            throw new Fault(
              401,
              'MCP_TOKEN_REQUIRED',
              '请使用当前平台网页端创建的个人访问令牌连接 MCP。',
            );
          await db.tenant(organizationId, (tx) => identity.subject(tx, actor, organizationId));
          const port: McpPlatformPort = {
            portalUrl,
            async request<T>(path: string, options: PlatformRequest = {}) {
              options.signal?.throwIfAborted();
              // Fixed in-process application routes. Neither URLs nor identity can be supplied by tool inputs.
              if (!path.startsWith('/') || path.startsWith('//') || path.includes('://'))
                throw new Fault(400, 'INVALID_TOOL_ARGUMENTS');
              const method = options.method ?? 'GET';
              const response = await fastify.inject({
                method,
                url: '/v1' + path,
                headers: {
                  authorization,
                  'x-organization-id': organizationId,
                  ...(method === 'POST' ? { 'idempotency-key': randomUUID() } : {}),
                  ...(options.body !== undefined ? { 'content-type': 'application/json' } : {}),
                },
                ...(options.body !== undefined ? { payload: JSON.stringify(options.body) } : {}),
              });
              options.signal?.throwIfAborted();
              const value: unknown = response.json();
              if (response.statusCode >= 400)
                throw platformResponseError(response.statusCode, method + ' ' + path, value);
              return value as T;
            },
          };
          const http = createEnterpriseMcpHttp(port);
          active.add(http);
          req.raw.once('aborted', () => {
            void http.close().catch(() => {});
          });
          reply.raw.once('close', () => {
            active.delete(http);
            void http.close().catch(() => {});
          });
          reply.hijack();
          try {
            await http.handle(
              Object.assign(req.raw, { method: req.method, url: req.url }),
              reply.raw,
              req.body,
            );
          } catch {
            log({ event: 'mcp.transport', status: 500, requestId: req.id });
            if (!reply.raw.headersSent) {
              reply.raw.writeHead(500, { 'Content-Type': 'application/json' });
              reply.raw.end(
                JSON.stringify({
                  error: {
                    code: 'MCP_TRANSPORT_FAILED',
                    message: 'MCP 请求处理失败，请重新连接。',
                    requestId: req.id,
                  },
                }),
              );
            } else reply.raw.end();
          }
        } catch (cause) {
          const fault =
            cause instanceof Fault
              ? cause
              : new Fault(503, 'DEPENDENCY_UNAVAILABLE', '平台身份服务暂时不可用，请稍后重试。');
          log({ event: 'mcp.request', status: fault.status, code: fault.code, requestId: req.id });
          if (fault.status === 401)
            reply.header('WWW-Authenticate', 'Bearer realm="enterprise-ai-studio"');
          return reply
            .code(fault.status)
            .send({ error: { code: fault.code, message: fault.safeMessage, requestId: req.id } });
        }
      },
    });
  }
  return {
    registerRoutes,
    async close() {
      await Promise.allSettled([...active].map((http) => http.close()));
      active.clear();
    },
  };
}
