import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import pg from 'pg';
import { createCatalogFixture, waitJob } from './catalog-fixture.mjs';
import { seedSalesFixture } from './sales-fixture.mjs';
import { startPostgres } from './postgres-fixture.mjs';
import { ManagedSecrets, signedRequest } from '../packages/connector-transport/dist/index.js';
export async function createReleaseFixture(options = {}) {
  const f = await createCatalogFixture({ withBuild: true, withProduction: true, ...options });
  let productionDb, productionPool;
  const children = [];
  const stop = async (child) => {
    if (child && child.exitCode === null && child.signalCode === null) {
      const exited = new Promise((resolve) => child.once('exit', resolve));
      child.kill();
      await exited;
    }
  };
  try {
    const s = await seedSalesFixture(f),
      tls = f.releaseTls;
    productionDb = await startPostgres({ host: tls.host, tlsFiles: tls.files });
    productionPool = new pg.Pool({
      connectionString: productionDb.url,
      ssl: { ca: tls.tls.ca, rejectUnauthorized: true },
    });
    const password = randomBytes(24).toString('hex');
    await productionPool.query(`CREATE ROLE eas_release_reader LOGIN PASSWORD '${password}' NOSUPERUSER NOBYPASSRLS; REVOKE CREATE ON SCHEMA public FROM PUBLIC; CREATE SCHEMA erp;
  CREATE TABLE erp.production_orders(order_id integer PRIMARY KEY,order_date date,quantity integer,amount numeric(12,2),status text,customer_id integer,customer_name text,product_name text,region text);
  CREATE VIEW erp.sales_analysis AS SELECT order_id,order_date,quantity,amount,status,customer_id,customer_name,product_name,region FROM erp.production_orders;
  GRANT CONNECT ON DATABASE postgres TO eas_release_reader; GRANT USAGE ON SCHEMA erp TO eas_release_reader; GRANT SELECT ON erp.sales_analysis TO eas_release_reader;`);
    const src = new URL(f.postgres.url);
    src.pathname = '/studio_sales_test';
    const input = new pg.Pool({ connectionString: src.toString() });
    try {
      for (const row of (await input.query('SELECT * FROM erp.sales_analysis ORDER BY order_id'))
        .rows)
        await productionPool.query(
          'INSERT INTO erp.production_orders VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',
          [
            row.order_id,
            row.order_date,
            row.quantity,
            Number(row.amount) * 2,
            row.status,
            row.customer_id,
            row.customer_name,
            row.product_name,
            row.region,
          ],
        );
    } finally {
      await input.end();
    }
    const secretConfig = {
      directory: resolve(tls.directory, 'production-secrets'),
      keyFile: resolve(tls.directory, 'production.key'),
    };
    await mkdir(secretConfig.directory);
    await writeFile(secretConfig.keyFile, randomBytes(32), { mode: 0o600 });
    const secretRef = await new ManagedSecrets(secretConfig, 'production').put({
      username: 'eas_release_reader',
      password,
      revision: '1',
    });
    const endpoint = randomUUID(),
      profile = randomUUID(),
      relation = { schema: 'erp', name: 'sales_analysis' };
    await f.pool.query(
      "INSERT INTO network_endpoints(id,organization_id,name,environment,host,port,allowed_cidrs,tls_server_name,engine,allowed_databases,allowed_relations,tls_mode,ca_ref,local_fixture) VALUES($1,$2,'独立验收生产模拟库','production',$3,$4,$5,$3,'postgresql',ARRAY['postgres'],$6,'verify-full','configured:database-ca',false)",
      [
        endpoint,
        f.organizationId,
        tls.host,
        productionDb.port,
        [tls.host + '/32'],
        JSON.stringify([relation]),
      ],
    );
    await f.pool.query(
      "INSERT INTO credential_profiles(id,organization_id,label,engine,environment,secret_ref,allowed_endpoint_ids) VALUES($1,$2,'独立验收只读账号','postgresql','production',$3,$4)",
      [profile, f.organizationId, secretRef, [endpoint]],
    );
    const spawnChild = (file, env) => {
      const child = spawn(process.execPath, [resolve(file)], {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, ...env },
      });
      let errors = '';
      child.stdout.on('data', () => {});
      child.stderr.on('data', (data) => (errors = (errors + data).slice(-2000)));
      child.safeError = () => errors;
      children.push(child);
      return child;
    };
    const production = spawnChild('services/query-worker/dist/main.js', {
      NODE_ENV: 'test',
      CATALOG_ALLOW_LOCAL: 'false',
      CATALOG_WORKER_ENV: 'production',
      CATALOG_WORKER_KEY: f.productionKey,
      CATALOG_API_URL: f.apiUrl,
      CATALOG_WORKER_PORT: String(f.productionPort),
      CATALOG_MANAGED_SECRET_DIR: secretConfig.directory,
      CATALOG_MANAGED_SECRET_KEY_FILE: secretConfig.keyFile,
      CATALOG_DATABASE_CA_FILE: tls.files.ca,
      ...Object.fromEntries(
        ['SERVER', 'CLIENT'].flatMap((side) =>
          Object.entries(tls.files).map(([name, path]) => [
            'CATALOG_' + side + '_TLS_' + name.toUpperCase(),
            path,
          ]),
        ),
      ),
    });
    const deploymentEnv = {
      NODE_ENV: 'test',
      DEPLOY_ALLOW_LOCAL: 'false',
      DEPLOY_WORKER_KEY: f.deployKey,
      DEPLOY_WORKER_PORT: String(f.deployPort),
      DEPLOY_ARTIFACT_DIR: resolve(tls.directory, 'deployed'),
      ...Object.fromEntries(
        Object.entries(tls.files).map(([name, path]) => ['DEPLOY_TLS_' + name.toUpperCase(), path]),
      ),
    };
    let deployment = spawnChild('services/deployment-worker/dist/main.js', deploymentEnv);
    for (let n = 0; n < 100; n++) {
      if (production.exitCode !== null || deployment.exitCode !== null)
        throw new Error(
          'Release worker exited: ' + production.safeError() + deployment.safeError(),
        );
      try {
        await signedRequest(
          new URL('/ping', f.productionTarget.url),
          f.productionKey,
          {},
          { tls: tls.tls, timeoutMs: 500 },
        );
        break;
      } catch {
        if (n === 99) throw new Error('Production connector not ready');
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    const ok = (r, status = 200) => {
      if (r.status !== status)
        throw new Error('Release fixture ' + r.status + ': ' + JSON.stringify(r.body));
      return r.body;
    };
    const connection = ok(
      await f.call('admin', 'POST', '/physical-connections', {
        name: '独立验收生产连接',
        environment: 'production',
        engine: 'postgresql',
        endpointId: endpoint,
        databaseName: 'postgres',
        credentialProfileId: profile,
        connectTimeoutMs: 2000,
        requestTimeoutMs: 5000,
        poolMax: 2,
        metadataScope: [relation],
      }),
      201,
    );
    for (const operation of ['tests', 'metadata-syncs']) {
      const job = ok(
          await f.call(
            'admin',
            'POST',
            '/physical-connections/' + connection.id + '/' + operation,
            operation === 'metadata-syncs' ? { relations: [relation] } : undefined,
          ),
          202,
        ),
        done = await waitJob(f, 'admin', job.id);
      if (done.status !== 'succeeded')
        throw new Error('Real PROD acceptance metadata failed: ' + done.failureCode);
    }
    const source = ok(
      await f.call('admin', 'GET', '/logical-data-sources/' + s.dataset.logicalDataSourceId),
    );
    ok(
      await f.call(
        'admin',
        'PUT',
        '/logical-data-sources/' + source.id + '/mappings?environment=production',
        { physicalConnectionId: connection.id },
        { 'If-Match': '"' + source.revision + '"' },
      ),
    );
    const steps = [
      { roleKey: 'business', label: '业务负责人', approverUserId: f.users.admin },
      { roleKey: 'data', label: '数据负责人', approverUserId: f.users.limited },
      { roleKey: 'it', label: 'IT 发布负责人', approverUserId: f.users.admin },
    ];
    ok(await f.call('admin', 'PUT', '/apps/' + s.app.id + '/release-policy', { steps }));
    const request = () => ({
      appVersionId: s.version.id,
      buildJobId: s.build.id,
      reason: '销售经营看板正式上线',
      testResults: '独立TEST验收：60笔、47040元；生产模拟库同样订单金额为2倍，用于证明环境路由。',
      targetDepartments: ['华东', '华南', '华北', '西南'],
      audienceUserIds: [f.users.developer],
      scopes: [
        {
          datasetVersionId: s.semantic.id,
          fieldKeys: s.semantic.fields.map((field) => field.key),
          metricKeys: s.semantic.metrics.map((metric) => metric.key),
          sensitiveFieldKeys: [],
        },
      ],
    });
    return {
      ...f,
      s,
      request,
      steps,
      productionDb,
      productionPool,
      productionConnection: connection,
      deploymentProcess: deployment,
      stopDeploymentWorker: () => stop(deployment),
      async restartDeploymentWorker() {
        deployment = spawnChild('services/deployment-worker/dist/main.js', deploymentEnv);
        for (let n = 0; n < 60; n++) {
          if (deployment.exitCode !== null) throw new Error('Deployment restart failed');
          try {
            const https = await import('node:https');
            await new Promise((resolve, reject) => {
              const req = https.get(
                f.deploymentWorker.url,
                { ca: tls.tls.ca, cert: tls.tls.cert, key: tls.tls.key },
                (res) => {
                  res.resume();
                  resolve();
                },
              );
              req.on('error', reject);
            });
            return;
          } catch {
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
        }
        throw new Error('Deployment restart timeout');
      },
      async close() {
        await f.close();
        for (const child of children) await stop(child);
        await productionPool.end();
        await productionDb.stop();
      },
    };
  } catch (error) {
    for (const child of children) await stop(child);
    await productionPool?.end();
    await productionDb?.stop();
    await f.close();
    throw error;
  }
}
export async function waitDeployment(f, id) {
  for (let n = 0; n < 300; n++) {
    const r = await f.call('admin', 'GET', '/deployments/' + id);
    if (r.status !== 200) throw new Error('Deployment read ' + JSON.stringify(r.body));
    if (['active', 'failed', 'superseded'].includes(r.body.status)) return r.body;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Deployment did not finish');
}
