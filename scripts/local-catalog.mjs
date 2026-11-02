import { startPreviewWorker } from './preview-worker.mjs';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFile } from 'node:fs/promises';
import { createCatalogFixture } from './catalog-fixture.mjs';
import { seedCatalogFixture } from './seed-catalog-fixture.mjs';
import { seedSalesFixture } from './sales-fixture.mjs';
export async function startLocalCatalog(port = 5173) {
  const preview = await startPreviewWorker();
  let fixture;
  try {
    fixture = await createCatalogFixture({
      withBuild: true,
      withDeployment: true,
      withPasswordAuth: true,
      previewWorker: preview.target,
      preserveDatabase: true,
    });
  } catch (error) {
    await preview.close();
    throw error;
  }
  let web;
  try {
    await seedCatalogFixture(fixture);
    const sales = await seedSalesFixture(fixture, { persistentTestAccess: true });
    await writeFile(
      resolve('work/local-sales.json'),
      JSON.stringify(
        { app: sales.app, version: sales.version, report: sales.report, expected: sales.expected },
        null,
        2,
      ),
    );
    const require = createRequire(resolve('apps/platform-web/package.json'));
    const vite = resolve(dirname(require.resolve('vite/package.json')), 'bin/vite.js');
    web = spawn(
      process.execPath,
      [vite, '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
      {
        cwd: resolve('apps/platform-web'),
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, VITE_API_PROXY: fixture.apiUrl },
      },
    );
    let output = '';
    web.stdout.on('data', (b) => (output = (output + b).slice(-2000)));
    web.stderr.on('data', (b) => (output = (output + b).slice(-2000)));
    for (let n = 0; n < 100; n++) {
      if (web.exitCode !== null) throw new Error('Web server exited: ' + output);
      try {
        const response = await fetch('http://127.0.0.1:' + port);
        if (response.ok) break;
      } catch {}
      if (n === 99) throw new Error('Web startup timed out');
      await new Promise((r) => setTimeout(r, 100));
    }
    await writeFile(
      resolve('work/initial-login.json'),
      JSON.stringify(
        { portalUrl: 'http://127.0.0.1:' + port, accounts: fixture.passwordAccounts },
        null,
        2,
      ),
      { mode: 0o600 },
    );
    const accessFile = resolve('work/local-access.json');
    await writeFile(
      accessFile,
      JSON.stringify(
        {
          webUrl: 'http://127.0.0.1:' + port,
          apiUrl: fixture.apiUrl,
          organizationId: fixture.organizationId,
          accounts: Object.fromEntries(
            Object.entries(fixture.tokens).map(([name, token]) => [
              name,
              { token, userId: fixture.users[name] },
            ]),
          ),
        },
        null,
        2,
      ),
      { mode: 0o600 },
    );
    return {
      fixture,
      webUrl: 'http://127.0.0.1:' + port,
      accessFile,
      async close() {
        if (web.exitCode === null) {
          const exited = new Promise((r) => web.once('exit', r));
          web.kill();
          await exited;
        }
        await fixture.close();
        await preview.close();
      },
    };
  } catch (error) {
    if (web?.exitCode === null) web.kill();
    await fixture.close();
    await preview.close();
    throw error;
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const local = await startLocalCatalog(Number(process.env['CATALOG_WEB_PORT'] ?? 5173));
  console.log('Catalog workspace: ' + local.webUrl);
  console.log(
    'Initial usernames and temporary passwords saved privately to work/initial-login.json; first login requires a password change.',
  );
  console.log(
    'Synthetic fixture data; PostgreSQL, API and connector are active. Press Ctrl+C to stop.',
  );
  for (const signal of ['SIGINT', 'SIGTERM'])
    process.once(signal, () => {
      void local.close().then(() => process.exit(0));
    });
}
