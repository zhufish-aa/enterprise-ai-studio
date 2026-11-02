import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { createApp } from '../apps/platform-api/dist/app.js';
import { signedRequest } from '../packages/connector-transport/dist/index.js';

// Operator-owned configuration lives outside the release and the public web root.
const config = JSON.parse(
  await readFile(
    process.env.EAS_RUNTIME_CONFIG ?? '/etc/enterprise-ai-studio/runtime.json',
    'utf8',
  ),
);
const tls = {
  ca: await readFile(config.tls.ca),
  cert: await readFile(config.tls.cert),
  key: await readFile(config.tls.key),
};
const children = [];
let stopping = false,
  app;
const stop = async (code = 0) => {
  if (stopping) return;
  stopping = true;
  await app?.close().catch(() => {});
  for (const child of children) if (child.exitCode === null) child.kill('SIGTERM');
  await Promise.race([
    Promise.all(
      children.map((child) =>
        child.exitCode === null ? new Promise((r) => child.once('exit', r)) : Promise.resolve(),
      ),
    ),
    new Promise((r) => setTimeout(r, 8000)),
  ]);
  process.exit(code);
};
function worker(name, env) {
  const child = spawn(process.execPath, [resolve('services', name, 'dist/main.js')], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production', ...env },
  });
  children.push(child);
  child.once('error', () => {
    console.error(name + ' failed to start');
    void stop(1);
  });
  child.once('exit', (code) => {
    if (!stopping) {
      console.error(name + ' stopped unexpectedly: ' + code);
      void stop(1);
    }
  });
}
const tlsEnv = (prefix) => ({
  [prefix + '_CA']: config.tls.ca,
  [prefix + '_CERT']: config.tls.cert,
  [prefix + '_KEY']: config.tls.key,
});
const target = (port, key) => ({ url: new URL('https://127.0.0.1:' + port), key, tls });
const apiUrl = 'https://127.0.0.1:' + config.ports.api;
try {
  worker('build-worker', {
    BUILD_WORKER_PORT: String(config.ports.build),
    BUILD_WORKER_KEY: config.keys.build,
    ...tlsEnv('BUILD_TLS'),
  });
  worker('deployment-worker', {
    DEPLOY_WORKER_PORT: String(config.ports.deploy),
    DEPLOY_WORKER_KEY: config.keys.deploy,
    DEPLOY_ARTIFACT_DIR: config.paths.deployments,
    ...tlsEnv('DEPLOY_TLS'),
  });
  worker('preview-worker', {
    PREVIEW_WORKER_PORT: String(config.ports.preview),
    PREVIEW_WORKER_KEY: config.keys.preview,
    PLAYWRIGHT_BROWSERS_PATH: config.paths.browsers,
    ...tlsEnv('PREVIEW_TLS'),
  });
  // These are the migrated, explicitly TEST-only local datasets. Never create a production fallback.
  worker('query-worker', {
    NODE_ENV: 'test',
    CATALOG_ALLOW_LOCAL: 'true',
    CATALOG_WORKER_ENV: 'test',
    CATALOG_WORKER_PORT: String(config.ports.query),
    CATALOG_WORKER_KEY: config.keys.query,
    CATALOG_API_URL: apiUrl,
    CATALOG_SECRET_FILE: config.paths.testCredentials,
    CATALOG_MANAGED_SECRET_DIR: config.paths.managedTest,
    CATALOG_MANAGED_SECRET_KEY_FILE: config.paths.managedTestKey,
    ...tlsEnv('CATALOG_SERVER_TLS'),
    ...tlsEnv('CATALOG_CLIENT_TLS'),
  });
  const db = config.database,
    databaseUrl = new URL('postgresql://127.0.0.1');
  databaseUrl.hostname = db.host;
  databaseUrl.port = String(db.port);
  databaseUrl.username = db.user;
  databaseUrl.password = db.password;
  databaseUrl.pathname = '/' + db.name;
  app = await createApp({
    databaseUrl: databaseUrl.href,
    apiTls: tls,
    cursorKey: config.keys.cursor,
    auth: {
      allowLocalSessions: false,
      passwordAuth: { enabled: true, allowedOrigins: [config.origin], secureCookies: true },
    },
    workers: { test: target(config.ports.query, config.keys.query) },
    buildWorker: target(config.ports.build, config.keys.build),
    deploymentWorker: target(config.ports.deploy, config.keys.deploy),
    previewWorker: target(config.ports.preview, config.keys.preview),
    siteWorker:
      config.ports.site && config.keys.site
        ? target(config.ports.site, config.keys.site)
        : undefined,
    managedSecrets: {
      test: { directory: config.paths.managedTest, keyFile: config.paths.managedTestKey },
    },
  });
  await app.listen(config.ports.api, '127.0.0.1');
  for (const name of ['query', 'preview']) {
    let ready = false;
    for (let attempt = 0; attempt < 50; attempt++) {
      try {
        await signedRequest(
          new URL('https://127.0.0.1:' + config.ports[name] + '/ping'),
          config.keys[name],
          {},
          { tls, timeoutMs: 1000 },
        );
        ready = true;
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 200));
      }
    }
    if (!ready) throw new Error(name + '_NOT_READY');
  }
  console.info(
    'Enterprise AI Studio ready; portal ' + config.origin + '; workers use loopback mTLS.',
  );
} catch (error) {
  console.error('Enterprise AI Studio startup failed: ' + (error.code ?? error.message));
  await stop(1);
}
for (const signal of ['SIGTERM', 'SIGINT'])
  process.once(signal, () => {
    void stop();
  });
