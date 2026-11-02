import { createServer as httpServer } from 'node:http';
import { createServer as httpsServer } from 'node:https';
import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { SignatureVerifier, signedHeaders, loadTls } from '@eas/connector-transport';
import type { DeploymentArtifactInput, DeploymentAttestation } from '@eas/api-contract';
export async function startDeploymentWorker() {
  const key = process.env['DEPLOY_WORKER_KEY'],
    directory = process.env['DEPLOY_ARTIFACT_DIR'];
  if (!key || key.length < 32 || !directory) throw new Error('DEPLOYMENT_CONFIGURATION_REQUIRED');
  const local = process.env['DEPLOY_ALLOW_LOCAL'] === 'true' && process.env['NODE_ENV'] === 'test',
    tls = await loadTls('DEPLOY_TLS');
  if (!local && !tls) throw new Error('DEPLOYMENT_MTLS_REQUIRED');
  await mkdir(directory, { recursive: true });
  const verifier = new SignatureVerifier(),
    hash = (value: string) => 'sha256:' + createHash('sha256').update(value).digest('hex');
  const handler: import('node:http').RequestListener = async (req, res) => {
    const send = (status: number, payload: unknown) => {
      res.writeHead(status, {
        'content-type': 'application/json',
        ...signedHeaders(key, 'RESPONSE', req.url ?? '', payload),
      });
      res.end(JSON.stringify(payload));
    };
    try {
      if (
        req.method !== 'POST' ||
        !['/prepare', '/health'].includes(req.url ?? '') ||
        (!local && !(req.socket as import('node:tls').TLSSocket).authorized)
      )
        throw new Error();
      const chunks: Buffer[] = [];
      let bytes = 0;
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > 16 * 1024 * 1024) throw new Error();
        chunks.push(chunk as Buffer);
      }
      const input: unknown = JSON.parse(Buffer.concat(chunks).toString());
      verifier.verify(key, 'POST', req.url!, input, req.headers);
      if (!input || typeof input !== 'object') throw new Error();
      const b = input as DeploymentArtifactInput;
      if (!/^[a-f0-9-]{36}$/i.test(b.deploymentId)) throw new Error();
      const file = resolve(directory, b.deploymentId + '.html');
      if (req.url === '/prepare') {
        if (
          Object.keys(b).sort().join(',') !==
            'artifactDigest,deploymentId,html,manifestDigest,sourceDigest' ||
          typeof b.html !== 'string' ||
          [b.sourceDigest, b.manifestDigest, b.artifactDigest].some(
            (d) => !/^sha256:[a-f0-9]{64}$/.test(d),
          ) ||
          hash(b.html) !== b.artifactDigest
        )
          throw new Error();
        // This service stores browser-only fixed compiler output; it never executes source or package scripts.
        if (
          !b.html.startsWith('<!doctype html>') ||
          !b.html.includes('Content-Security-Policy') ||
          !b.html.includes("connect-src 'none'") ||
          !b.html.includes("default-src 'none'") ||
          /<script[^>]+src\s*=/i.test(b.html)
        )
          return send(200, { ok: false, code: 'DEPLOYMENT_ARTIFACT_INVALID' });
        const temp = file + '.' + randomUUID() + '.tmp';
        await writeFile(temp, b.html, { mode: 0o600 });
        await rename(temp, file);
        return send(200, { ok: true, artifactDigest: b.artifactDigest });
      }
      if (
        Object.keys(b).sort().join(',') !==
        'artifactDigest,deploymentId,manifestDigest,sourceDigest'
      )
        throw new Error();
      const content = await readFile(file, 'utf8');
      if (hash(content) !== b.artifactDigest)
        return send(200, { ok: false, code: 'DEPLOYMENT_HEALTH_FAILED' });
      const attestation: DeploymentAttestation = {
        profile: 'opaque-static-v1',
        deploymentId: b.deploymentId,
        sourceDigest: b.sourceDigest,
        manifestDigest: b.manifestDigest,
        artifactDigest: b.artifactDigest,
        health: 'passed',
      };
      return send(200, { ok: true, attestation });
    } catch {
      send(403, { error: 'DEPLOYMENT_REQUEST_REJECTED' });
    }
  };
  const server = local
    ? httpServer(handler)
    : httpsServer({ ...tls!, requestCert: true, rejectUnauthorized: true }, handler);
  server.requestTimeout = 35000;
  const host = process.env['DEPLOY_WORKER_HOST'] ?? '127.0.0.1';
  if (local && host !== '127.0.0.1') throw new Error('DEPLOYMENT_MTLS_REQUIRED');
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(Number(process.env['DEPLOY_WORKER_PORT'] ?? 4100), host, resolve);
  });
  return server;
}
