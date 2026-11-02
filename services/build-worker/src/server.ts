import { createServer as httpServer } from 'node:http';
import { createServer as httpsServer } from 'node:https';
import { readFile } from 'node:fs/promises';
import { SignatureVerifier, signedHeaders } from '@eas/connector-transport';
import type { components } from '@eas/api-contract';
import { compile, compileFullstack } from './compiler.js';
export async function startCompiler() {
  const key = process.env['BUILD_WORKER_KEY'];
  if (!key || key.length < 32) throw new Error('BUILD_WORKER_KEY_REQUIRED');
  const local =
    process.env['BUILD_ALLOW_LOCAL'] === 'true' &&
    ['development', 'test'].includes(process.env['NODE_ENV'] ?? '');
  const verify = new SignatureVerifier();
  let active = false;
  const handler: import('node:http').RequestListener = async (req, res) => {
    let body: unknown;
    try {
      if (
        req.method !== 'POST' ||
        req.url !== '/compile' ||
        (!local && !(req.socket as import('node:tls').TLSSocket).authorized)
      )
        throw new Error();
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 16 * 1024 * 1024) throw new Error();
        chunks.push(chunk as Buffer);
      }
      body = JSON.parse(Buffer.concat(chunks).toString());
      verify.verify(key, 'POST', '/compile', body, req.headers);
      const b = body as {
        profile?: string;
        files?: components['schemas']['SourceUpload']['files'];
        runtime?: { entrypoint: string; dataSource: string };
      };
      if (
        !['react-static-v1', 'site-fullstack-v1'].includes(b.profile ?? '') ||
        !Array.isArray(b.files) ||
        b.files.some((f) => !f || typeof f.path !== 'string' || typeof f.content !== 'string') ||
        Object.keys(b).some((k) => !['files', 'profile', 'runtime'].includes(k))
      )
        throw new Error();
      if (active) throw new Error();
      active = true;
      let result;
      try {
        result =
          b.profile === 'site-fullstack-v1' && b.runtime
            ? await compileFullstack(b.files, b.runtime)
            : await compile(b.files);
      } finally {
        active = false;
      }
      res.writeHead(200, {
        'content-type': 'application/json',
        ...signedHeaders(key, 'RESPONSE', '/compile', result),
      });
      res.end(JSON.stringify(result));
    } catch {
      const result = { ok: false, code: 'BUILD_REQUEST_REJECTED' };
      res.writeHead(403, {
        'content-type': 'application/json',
        ...signedHeaders(key, 'RESPONSE', '/compile', result),
      });
      res.end(JSON.stringify(result));
    }
  };
  const server = local
    ? httpServer(handler)
    : httpsServer(
        {
          key: await readFile(process.env['BUILD_TLS_KEY'] ?? ''),
          cert: await readFile(process.env['BUILD_TLS_CERT'] ?? ''),
          ca: await readFile(process.env['BUILD_TLS_CA'] ?? ''),
          requestCert: true,
          rejectUnauthorized: true,
        },
        handler,
      );
  server.requestTimeout = 35000;
  await new Promise<void>((r) =>
    server.listen(Number(process.env['BUILD_WORKER_PORT'] ?? 4090), '127.0.0.1', r),
  );
  return server;
}
