import { initializeAccount } from './initialize-account.mjs';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';
import { startPostgres, unusedPort } from './postgres-fixture.mjs';
import { migrate } from './migrate.mjs';
import { createApp } from '../apps/platform-api/dist/app.js';
import { spawn } from 'node:child_process';
import { signedRequest } from '../packages/connector-transport/dist/index.js';
import https from 'node:https';
import { createReleaseTlsFixture } from './release-tls-fixture.mjs';
export async function createCatalogFixture({
  withBuild = false,
  withPasswordAuth = false,
  passwordOrigins = [],
  withProduction = false,
  withDeployment = false,
  previewWorker,
  preserveDatabase = false,
} = {}) {
  const postgres = await startPostgres({ preserveData: preserveDatabase }),
    pool = new pg.Pool({ connectionString: postgres.url });
  let app, connector, sourcePool, compiler, deploymentChild;
  try {
    await migrate(pool);
    const organizationId = randomUUID(),
      otherOrganizationId = randomUUID(),
      users = Object.fromEntries(
        ['admin', 'developer', 'limited', 'outsider', 'ai'].map((k) => [k, randomUUID()]),
      );
    await pool.query(
      "INSERT INTO organizations(id,key,name) VALUES($1,'demo','星河科技'),($2,'other','独立组织')",
      [organizationId, otherOrganizationId],
    );
    const permissions = [
      'release.create',
      'release.read',
      'release.deploy',
      'release.policy.manage',
      'app.create',
      'app.develop',
      'session.read',
      'source.read',
      'dataset.read',
      'dataset.query.test',
      'catalog.manage',
      'network.manage',
      'connection.manage',
      'mapping.manage',
      'permission.manage',
      'connection.test.test',
      'connection.test.production',
      'connection.metadata.test',
      'connection.metadata.production',
      'dataset.query.production',
      'dataset.export',
      'dataset.unmask',
      'app.view',
      'report.view',
      'query.policy.manage',
      'query.diagnose',
      'query.audit.read',
      'release.approve',
    ];
    for (const key of permissions)
      await pool.query(
        'INSERT INTO permissions(key,description) VALUES($1,$1) ON CONFLICT DO NOTHING',
        [key],
      );
    const tokens = {};
    for (const [name, id] of Object.entries(users)) {
      await pool.query(
        "INSERT INTO users(id,oidc_issuer,oidc_subject,display_name,status) VALUES($1,'local-development',$2,$3,'active')",
        [
          id,
          name,
          {
            admin: '林知远',
            developer: '陈一诺',
            limited: '连接维护员',
            outsider: '未授权成员',
            ai: 'AI 客户端',
          }[name],
        ],
      );
      await pool.query(
        "INSERT INTO organization_members(organization_id,user_id,status) VALUES($1,$2,'active')",
        [name === 'outsider' ? otherOrganizationId : organizationId, id],
      );
      const role = randomUUID();
      await pool.query('INSERT INTO roles(id,organization_id,key,name) VALUES($1,$2,$3,$3)', [
        role,
        name === 'outsider' ? otherOrganizationId : organizationId,
        name,
      ]);
      const actions =
        name === 'developer'
          ? permissions.filter((k) =>
              [
                'release.create',
                'release.read',
                'app.create',
                'app.develop',
                'session.read',
                'source.read',
                'dataset.read',
                'dataset.query.test',
                'dataset.query.production',
                'dataset.export',
                'app.view',
                'report.view',
              ].includes(k),
            )
          : name === 'outsider'
            ? ['session.read', 'source.read', 'dataset.read']
            : name === 'limited'
              ? permissions.filter((k) => !k.endsWith('.production') && k !== 'network.manage')
              : permissions;
      for (const action of actions)
        await pool.query(
          'INSERT INTO role_permissions(organization_id,role_id,permission_key) VALUES($1,$2,$3)',
          [name === 'outsider' ? otherOrganizationId : organizationId, role, action],
        );
      await pool.query(
        'INSERT INTO role_bindings(organization_id,user_id,role_id) VALUES($1,$2,$3)',
        [name === 'outsider' ? otherOrganizationId : organizationId, id, role],
      );
      tokens[name] = 'eas_local_' + randomBytes(32).toString('base64url');
      await pool.query(
        "INSERT INTO auth_sessions(token_hash,user_id,client_kind,expires_at) VALUES($1,$2,$3,now()+interval '8 hours')",
        [
          createHash('sha256').update(tokens[name]).digest('hex'),
          id,
          name === 'ai' ? 'ai' : 'human',
        ],
      );
    }
    const passwordAccounts = withPasswordAuth
      ? {
          admin: { username: 'admin', password: 'Eas!' + randomBytes(15).toString('base64url') },
          developer: {
            username: 'developer',
            password: 'Eas!' + randomBytes(15).toString('base64url'),
          },
        }
      : null;
    if (passwordAccounts)
      for (const [name, value] of Object.entries(passwordAccounts))
        await initializeAccount(pool, {
          organizationId,
          userId: users[name],
          username: value.username,
          displayName: name,
          password: value.password,
          administrator: name === 'admin',
        });
    const runtimePassword = randomBytes(24).toString('hex'),
      readerPassword = randomBytes(24).toString('hex');
    await pool.query(
      `CREATE ROLE eas_catalog_runtime LOGIN PASSWORD '${runtimePassword}' NOSUPERUSER NOBYPASSRLS INHERIT`,
    );
    await pool.query('GRANT eas_api TO eas_catalog_runtime');
    await pool.query(
      `CREATE ROLE eas_source_reader LOGIN PASSWORD '${readerPassword}' NOSUPERUSER NOBYPASSRLS`,
    );
    await pool.query('CREATE DATABASE source_test');
    const sourceUrl = new URL(postgres.url);
    sourceUrl.pathname = '/source_test';
    sourcePool = new pg.Pool({ connectionString: sourceUrl.toString() });
    await sourcePool.query(`REVOKE ALL ON DATABASE source_test FROM PUBLIC; GRANT CONNECT ON DATABASE source_test TO eas_source_reader; REVOKE CREATE ON SCHEMA public FROM PUBLIC; CREATE SCHEMA sales;
    CREATE TABLE sales.customers(id integer PRIMARY KEY,name text NOT NULL);
    CREATE TABLE sales.orders(id integer PRIMARY KEY,customer_id integer REFERENCES sales.customers(id),region text NOT NULL,amount numeric(12,2) NOT NULL,order_date date NOT NULL,status text NOT NULL);
    COMMENT ON TABLE sales.orders IS '销售订单'; COMMENT ON COLUMN sales.orders.amount IS '订单含税金额（元）';
    CREATE INDEX orders_region_idx ON sales.orders(region);
    CREATE VIEW sales.sales_summary AS SELECT region,sum(amount) AS amount FROM sales.orders GROUP BY region;
    CREATE TABLE sales.private_payroll(id integer PRIMARY KEY,salary numeric);
    INSERT INTO sales.customers VALUES(1,'远山制造'),(2,'蓝湾科技');
    INSERT INTO sales.orders VALUES(1001,1,'华东',12800.00,'2026-10-01','paid'),(1002,2,'华南',8600.00,'2026-10-05','paid'),(1003,1,'华东',4200.00,'2026-10-08','pending');
    GRANT USAGE ON SCHEMA sales TO eas_source_reader; GRANT SELECT ON sales.orders,sales.customers,sales.sales_summary TO eas_source_reader;`);
    const relations = [
      { schema: 'sales', name: 'orders' },
      { schema: 'sales', name: 'customers' },
      { schema: 'sales', name: 'sales_summary' },
    ];
    const endpointId = randomUUID(),
      productionEndpointId = randomUUID(),
      blockedEndpointId = randomUUID(),
      profileId = randomUUID(),
      productionProfileId = randomUUID();
    const endpointSql = `INSERT INTO network_endpoints(id,organization_id,name,environment,host,port,allowed_cidrs,tls_server_name,engine,allowed_databases,allowed_relations,tls_mode,local_fixture) VALUES($1,$2,$3,$4,$5,$6,$7,$5,'postgresql',$8,$9,$10,$11)`;
    await pool.query(endpointSql, [
      endpointId,
      organizationId,
      '本机销售测试库',
      'test',
      '127.0.0.1',
      postgres.port,
      ['127.0.0.1/32'],
      ['source_test'],
      JSON.stringify(relations),
      'disable-fixture',
      true,
    ]);
    await pool.query(endpointSql, [
      productionEndpointId,
      organizationId,
      '批准的生产端点',
      'production',
      '10.240.33.11',
      5432,
      ['10.240.33.11/32'],
      ['sales_production'],
      JSON.stringify(relations),
      'verify-full',
      false,
    ]);
    await pool.query(endpointSql, [
      blockedEndpointId,
      organizationId,
      '白名单拒绝测试',
      'test',
      '10.250.1.9',
      5432,
      ['10.250.1.8/32'],
      ['source_test'],
      JSON.stringify(relations),
      'verify-full',
      false,
    ]);
    await pool.query(
      "INSERT INTO credential_profiles(id,organization_id,label,engine,environment,secret_ref,allowed_endpoint_ids) VALUES($1,$2,'销售只读账号','postgresql','test','local:sales-reader',$3),($4,$2,'生产只读账号','postgresql','production','secret/data/production/sales',$5)",
      [
        profileId,
        organizationId,
        [endpointId, blockedEndpointId],
        productionProfileId,
        [productionEndpointId],
      ],
    );
    const secretFile = resolve(postgres.directory, 'connector-secrets.json');
    const secretData = {
      'local:sales-reader': {
        username: 'eas_source_reader',
        password: readerPassword,
        revision: '1',
      },
    };
    await writeFile(secretFile, JSON.stringify(secretData), { mode: 0o600 });
    const managedSecretConfig = {
      directory: resolve(postgres.directory, 'managed-secrets'),
      keyFile: resolve(postgres.directory, 'managed-secret-key'),
    };
    await mkdir(managedSecretConfig.directory, { mode: 0o700 });
    await writeFile(managedSecretConfig.keyFile, randomBytes(32), { mode: 0o600 });
    const apiPort = await unusedPort(),
      connectorPort = await unusedPort(),
      key = randomBytes(32).toString('hex'),
      cursorKey = randomBytes(32).toString('hex'),
      logs = [];
    const runtimeUrl = `postgresql://eas_catalog_runtime:${runtimePassword}@127.0.0.1:${postgres.port}/postgres`;
    let buildWorker;
    if (withBuild) {
      const port = await unusedPort(),
        buildKey = randomBytes(32).toString('hex');
      compiler = spawn(process.execPath, [resolve('services/build-worker/dist/main.js')], {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          NODE_ENV: 'test',
          BUILD_ALLOW_LOCAL: 'true',
          BUILD_WORKER_PORT: String(port),
          BUILD_WORKER_KEY: buildKey,
        },
      });
      let output = '';
      compiler.stderr.on('data', (b) => (output = (output + b).slice(-1000)));
      for (let i = 0; i < 100; i++) {
        if (compiler.exitCode !== null) throw new Error('Compiler exited ' + output);
        try {
          await fetch('http://127.0.0.1:' + port);
          break;
        } catch {}
        if (i === 99) throw new Error('Compiler startup timed out');
        await new Promise((r) => setTimeout(r, 100));
      }
      buildWorker = {
        url: new URL('http://127.0.0.1:' + port),
        key: buildKey,
        allowLocalHttp: true,
      };
    }
    const releaseTls = withProduction ? await createReleaseTlsFixture() : null,
      productionPort = withProduction ? await unusedPort() : null,
      productionKey = randomBytes(32).toString('hex'),
      deployPort = withProduction || withDeployment ? await unusedPort() : null,
      deployKey = randomBytes(32).toString('hex');
    const productionTarget = releaseTls
        ? {
            url: new URL('https://127.0.0.1:' + productionPort),
            key: productionKey,
            tls: releaseTls.tls,
          }
        : undefined,
      deploymentWorker = releaseTls
        ? { url: new URL('https://127.0.0.1:' + deployPort), key: deployKey, tls: releaseTls.tls }
        : withDeployment
          ? { url: new URL('http://127.0.0.1:' + deployPort), key: deployKey, allowLocalHttp: true }
          : undefined;
    if (withDeployment && !withProduction) {
      deploymentChild = spawn(
        process.execPath,
        [resolve('services/deployment-worker/dist/main.js')],
        {
          windowsHide: true,
          stdio: 'ignore',
          env: {
            ...process.env,
            NODE_ENV: 'test',
            DEPLOY_ALLOW_LOCAL: 'true',
            DEPLOY_WORKER_PORT: String(deployPort),
            DEPLOY_WORKER_KEY: deployKey,
            DEPLOY_ARTIFACT_DIR: resolve(postgres.directory, 'deployment-artifacts'),
          },
        },
      );
    }
    const protocol = releaseTls ? 'https:' : 'http:';
    app = await createApp({
      previewWorker,
      databaseUrl: runtimeUrl,
      apiTls: releaseTls?.tls,
      managedSecrets: { test: managedSecretConfig },
      auth: {
        allowLocalSessions: true,
        ...(withPasswordAuth
          ? {
              passwordAuth: {
                enabled: true,
                allowedOrigins: [
                  'http://127.0.0.1:' + apiPort,
                  'http://127.0.0.1:5173',
                  ...passwordOrigins,
                ],
                secureCookies: false,
              },
            }
          : {}),
      },
      cursorKey,
      workers: {
        test: { url: new URL('http://127.0.0.1:' + connectorPort), key, allowLocalHttp: true },
        ...(productionTarget ? { production: productionTarget } : {}),
      },
      buildWorker,
      deploymentWorker,
      log: (r) => logs.push(r),
    });
    await app.listen(apiPort, '127.0.0.1');
    const child = spawn(process.execPath, [resolve('services/query-worker/dist/main.js')], {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        CATALOG_ALLOW_LOCAL: 'true',
        CATALOG_WORKER_ENV: 'test',
        CATALOG_WORKER_KEY: key,
        CATALOG_API_URL: protocol + '//127.0.0.1:' + apiPort,
        CATALOG_WORKER_PORT: String(connectorPort),
        CATALOG_SECRET_FILE: secretFile,
        CATALOG_MANAGED_SECRET_DIR: managedSecretConfig.directory,
        CATALOG_MANAGED_SECRET_KEY_FILE: managedSecretConfig.keyFile,
        ...(releaseTls
          ? {
              CATALOG_CLIENT_TLS_CERT: releaseTls.files.cert,
              CATALOG_CLIENT_TLS_KEY: releaseTls.files.key,
              CATALOG_CLIENT_TLS_CA: releaseTls.files.ca,
            }
          : {}),
      },
    });
    let childOutput = '';
    child.stdout.on('data', (b) => (childOutput = (childOutput + b).slice(-4096)));
    child.stderr.on('data', (b) => (childOutput = (childOutput + b).slice(-4096)));
    connector = {
      async close() {
        if (child.exitCode !== null) return;
        const exited = new Promise((r) => child.once('exit', r));
        child.kill();
        await exited;
      },
    };
    let ready = false;
    for (let i = 0; i < 100; i++) {
      if (child.exitCode !== null) throw new Error('Connector failed to start: ' + childOutput);
      try {
        await signedRequest(
          new URL('http://127.0.0.1:' + connectorPort + '/ping'),
          key,
          {},
          { allowLocalHttp: true, timeoutMs: 500 },
        );
        ready = true;
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    if (!ready) throw new Error('Connector startup timed out');
    const apiUrl = protocol + '//127.0.0.1:' + apiPort;
    const call = async (name, method, path, body, headers = {}) => {
      const options = {
        method,
        headers: {
          Authorization: 'Bearer ' + tokens[name],
          'X-Organization-Id': name === 'outsider' ? otherOrganizationId : organizationId,
          ...(method !== 'GET' ? { 'Idempotency-Key': randomUUID() } : {}),
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...headers,
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      };
      const response = releaseTls
        ? await new Promise((resolve, reject) => {
            const request = https.request(
              apiUrl + '/v1' + path,
              { method, headers: options.headers, ca: releaseTls.tls.ca },
              (response) => {
                const chunks = [];
                response.on('data', (chunk) => chunks.push(chunk));
                response.on('end', () =>
                  resolve({
                    status: response.statusCode,
                    headers: new Headers(
                      Object.fromEntries(
                        Object.entries(response.headers).map(([key, value]) => [
                          key,
                          Array.isArray(value) ? value.join(',') : (value ?? ''),
                        ]),
                      ),
                    ),
                    json: async () => JSON.parse(Buffer.concat(chunks).toString()),
                  }),
                );
              },
            );
            request.on('error', reject);
            request.end(options.body);
          })
        : await fetch(apiUrl + '/v1' + path, options);
      return { status: response.status, headers: response.headers, body: await response.json() };
    };
    return {
      releaseTls,
      productionTarget,
      deploymentWorker,
      deployPort,
      deployKey,
      productionPort,
      productionKey,
      managedSecretConfig,
      passwordAccounts,
      postgres,
      pool,
      sourcePool,
      app,
      connector,
      apiUrl,
      connectorUrl: 'http://127.0.0.1:' + connectorPort,
      workerKey: key,
      organizationId,
      otherOrganizationId,
      users,
      tokens,
      logs,
      endpointId,
      productionEndpointId,
      blockedEndpointId,
      profileId,
      productionProfileId,
      relations,
      readerPassword,
      secretData,
      secretFile,
      runtimeUrl,
      call,
      async close() {
        await app.close();
        await connector.close();
        for (const child of [compiler, deploymentChild])
          if (child?.exitCode === null && child.signalCode === null) {
            const exited = new Promise((r) => child.once('exit', r));
            child.kill();
            await exited;
          }
        await sourcePool.end();
        await pool.end();
        await postgres.stop();
      },
    };
  } catch (error) {
    if (app) await app.close();
    if (connector) await connector.close();
    if (compiler?.exitCode === null) compiler.kill();
    if (deploymentChild?.exitCode === null) deploymentChild.kill();
    if (sourcePool) await sourcePool.end();
    await pool.end();
    await postgres.stop();
    throw error;
  }
}
export async function waitJob(f, name, id) {
  for (let n = 0; n < 150; n++) {
    const response = await f.call(name, 'GET', '/catalog-jobs/' + id);
    if (response.status !== 200)
      throw new Error('Job read failed: ' + JSON.stringify(response.body));
    if (['succeeded', 'failed'].includes(response.body.status)) return response.body;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('Job did not finish within 15 seconds');
}
