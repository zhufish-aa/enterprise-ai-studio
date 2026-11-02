import { createServer } from 'node:https';
import { readFile } from 'node:fs/promises';
import { SignatureVerifier, signedHeaders } from '@eas/connector-transport';
import { SiteController, type SiteWorkerConfig } from './runtime.js';
const config = JSON.parse(
  await readFile(
    process.env['SITE_WORKER_CONFIG'] ?? '/etc/enterprise-ai-studio/sites.json',
    'utf8',
  ),
) as SiteWorkerConfig;
const controller = new SiteController(config),
  verifier = new SignatureVerifier();
const server = createServer(
  {
    key: await readFile(config.tls.key),
    cert: await readFile(config.tls.cert),
    ca: await readFile(config.tls.ca),
    requestCert: true,
    rejectUnauthorized: true,
  },
  async (req, res) => {
    const path = req.url ?? '';
    let result: unknown;
    try {
      if (
        req.method !== 'POST' ||
        ![
          '/sources',
          '/configure',
          '/inspect',
          '/deploy',
          '/status',
          '/request',
          '/ping',
          '/promote',
        ].includes(path)
      )
        throw Error('REQUEST_REJECTED');
      const chunks: Buffer[] = [];
      let bytes = 0;
      for await (const part of req) {
        bytes += part.length;
        if (bytes > 32 * 1024 * 1024) throw Error('REQUEST_TOO_LARGE');
        chunks.push(part as Buffer);
      }
      const body: unknown = JSON.parse(Buffer.concat(chunks).toString());
      verifier.verify(config.key, 'POST', path, body, req.headers);
      result = await controller.handle(path, body);
    } catch (error) {
      const raw = (error as { code?: string }).code,
        code =
          raw === '28P01'
            ? 'SITE_DATABASE_AUTH_FAILED'
            : ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'].includes(raw ?? '')
              ? 'SITE_DATABASE_UNREACHABLE'
              : error instanceof Error && /^[A-Z_]+$/.test(error.message)
                ? error.message
                : 'SITE_WORKER_UNAVAILABLE';
      const messages: Record<string, string> = {
        SITE_DATABASE_AUTH_FAILED: '数据库账号或密码不正确，请在此站点的数据源设置中修改。',
        SITE_DATABASE_UNREACHABLE: '无法连接数据库，请检查主机、端口和数据库服务状态。',
        SITE_DATABASE_ROLE_UNSAFE: '请使用此站点专用的普通数据库账号，不要使用数据库超级用户。',
        SITE_DATASOURCE_REQUIRED: '此版本使用的数据源尚未配置，请先在站点数据源中添加连接。',
        SITE_DATASOURCE_REVISION_CONFLICT: '此数据源已被更新，请刷新数据源列表后再保存。',
        SITE_MIGRATION_CHANGED: '已执行的数据库迁移被修改，请恢复原文件并追加新迁移。',
        SITE_HEALTH_CHECK_FAILED: '站点后端健康检查未通过，请查看后端运行日志。',
      };
      result = {
        ok: false,
        code,
        message: messages[code] ?? '站点运行服务未完成此操作，请查看后端运行日志。',
      };
    }
    res.writeHead(200, {
      'content-type': 'application/json',
      ...signedHeaders(config.key, 'RESPONSE', path, result),
    });
    res.end(JSON.stringify(result));
  },
);
server.requestTimeout = 180000;
await new Promise<void>((r) => server.listen(config.port, '127.0.0.1', r));
for (const signal of ['SIGTERM', 'SIGINT'])
  process.once(signal, () =>
    server.close(() => {
      controller.close();
      process.exit(0);
    }),
  );
