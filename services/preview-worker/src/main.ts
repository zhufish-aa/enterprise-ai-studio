import { createServer as httpServer } from 'node:http';
import { createServer as httpsServer } from 'node:https';
import { SignatureVerifier, signedHeaders, loadTls } from '@eas/connector-transport';
import type { components } from '@eas/api-contract';
import * as browser from './browser.js';
type S = components['schemas'];
const key = process.env['PREVIEW_WORKER_KEY'];
if (!key || key.length < 32) throw new Error('PREVIEW_WORKER_KEY_REQUIRED');
const local =
  process.env['PREVIEW_ALLOW_LOCAL'] === 'true' &&
  ['test', 'development'].includes(process.env['NODE_ENV'] ?? '');
const tls = await loadTls('PREVIEW_TLS');
if (!local && !tls) throw new Error('PREVIEW_MTLS_REQUIRED');
const verifier = new SignatureVerifier();
const handler: import('node:http').RequestListener = async (req, res) => {
  const path = req.url ?? '';
  let result: unknown;
  try {
    if (
      req.method !== 'POST' ||
      !['/ping', '/open', '/events', '/action', '/resolve', '/screenshot', '/close'].includes(
        path,
      ) ||
      (!local && !(req.socket as import('node:tls').TLSSocket).authorized)
    )
      throw new Error('DEBUG_REQUEST_REJECTED');
    const chunks: Buffer[] = [];
    let bytes = 0;
    for await (const chunk of req) {
      bytes += chunk.length;
      if (bytes > 16777216) throw new Error('DEBUG_PAYLOAD_TOO_LARGE');
      chunks.push(chunk as Buffer);
    }
    const body = JSON.parse(Buffer.concat(chunks).toString()) as {
      id: string;
      preview: S['StudioPreview'];
      viewport: { width: number; height: number };
      after?: number;
      action: S['StudioDebugAction'];
      queryId: string;
      response: object;
      fullPage?: boolean;
      selector?: string;
    };
    verifier.verify(key, 'POST', path, body, req.headers);
    if (path !== '/ping' && !/^[a-f0-9-]{36}$/i.test(body.id))
      throw new Error('DEBUG_REQUEST_REJECTED');
    switch (path) {
      case '/ping':
        result = { ready: true };
        break;
      case '/open':
        result = await browser.open(body.id, body.preview, body.viewport);
        break;
      case '/events':
        result = browser.observe(body.id, body.after);
        break;
      case '/action':
        result = await browser.action(body.id, body.action);
        break;
      case '/resolve':
        result = await browser.resolveQuery(body.id, body.queryId, body.response);
        break;
      case '/screenshot':
        result = await browser.screenshot(body.id, body.fullPage !== false, body.selector);
        break;
      case '/close':
        result = await browser.close(body.id);
        break;
    }
    result = { ok: true, data: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'DEBUG_FAILED';
    const code = message.includes("Executable doesn't exist")
      ? 'DEBUG_BROWSER_NOT_INSTALLED'
      : /^[A-Z_]+$/.test(message)
        ? message
        : 'DEBUG_BROWSER_OPERATION_FAILED';
    result = {
      ok: false,
      code,
      message: message.replace(/([A-Z]:)?[/\\][^\s]*node_modules[^\n]*/g, '[browser runtime]'),
    };
  }
  res.writeHead(200, {
    'content-type': 'application/json',
    ...signedHeaders(key, 'RESPONSE', path, result),
  });
  res.end(JSON.stringify(result));
};
const server = local
  ? httpServer(handler)
  : httpsServer({ ...tls, requestCert: true, rejectUnauthorized: true }, handler);
server.requestTimeout = 120000;
await new Promise<void>((resolve) =>
  server.listen(
    Number(process.env['PREVIEW_WORKER_PORT'] ?? 4092),
    process.env['PREVIEW_WORKER_HOST'] ?? '127.0.0.1',
    resolve,
  ),
);
console.info('Preview browser worker listening.');
for (const signal of ['SIGTERM', 'SIGINT'])
  process.once(signal, () => {
    void browser.shutdown().finally(() => server.close(() => process.exit(0)));
  });
