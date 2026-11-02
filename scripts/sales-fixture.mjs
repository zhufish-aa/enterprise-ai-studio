import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { mkdir, writeFile } from 'node:fs/promises';
import { waitJob } from './catalog-fixture.mjs';
export async function seedSalesFixture(f, { persistentTestAccess = false } = {}) {
  const ok = (r, status = 200) => {
    if (r.status !== status)
      throw new Error('Sales fixture ' + r.status + ': ' + JSON.stringify(r.body));
    return r.body;
  };
  const call = async (method, path, body, headers) =>
    ok(await f.call('admin', method, path, body, headers), method === 'POST' ? 201 : 200);
  await f.pool.query('CREATE DATABASE studio_sales_test');
  const url = new URL(f.postgres.url);
  url.pathname = '/studio_sales_test';
  const pool = new pg.Pool({ connectionString: url.toString() });
  const regions = ['华东', '华南', '华北', '西南'],
    products = [
      ['办公设备', 128],
      ['智能终端', 320],
      ['企业服务', 680],
    ],
    orders = [];
  try {
    await pool.query(
      "REVOKE ALL ON DATABASE studio_sales_test FROM PUBLIC; GRANT CONNECT ON DATABASE studio_sales_test TO eas_source_reader; REVOKE CREATE ON SCHEMA public FROM PUBLIC; CREATE SCHEMA erp; CREATE TABLE erp.regions(id integer PRIMARY KEY,name text UNIQUE NOT NULL); CREATE TABLE erp.customers(id integer PRIMARY KEY,name text NOT NULL,region_id integer NOT NULL REFERENCES erp.regions(id)); CREATE TABLE erp.products(id integer PRIMARY KEY,name text NOT NULL,unit_price numeric(12,2) NOT NULL); CREATE TABLE erp.orders(id integer PRIMARY KEY,customer_id integer NOT NULL REFERENCES erp.customers(id),product_id integer NOT NULL REFERENCES erp.products(id),quantity integer NOT NULL,amount numeric(12,2) NOT NULL,order_date date NOT NULL,status text NOT NULL); COMMENT ON COLUMN erp.orders.amount IS '已支付订单的含税销售额，人民币元';",
    );
    for (let i = 0; i < 4; i++) {
      await pool.query('INSERT INTO erp.regions VALUES($1,$2)', [i + 1, regions[i]]);
      await pool.query('INSERT INTO erp.customers VALUES($1,$2,$1)', [
        i + 1,
        ['远山制造', '蓝湾科技', '北辰工业', '云川商贸'][i],
      ]);
    }
    for (let i = 0; i < 3; i++)
      await pool.query('INSERT INTO erp.products VALUES($1,$2,$3)', [i + 1, ...products[i]]);
    for (let day = 0; day < 30; day++)
      for (let k = 0; k < 2; k++) {
        const product = (day * 2 + k) % 3,
          quantity = k === 0 ? 1 + (day % 3) : 2,
          amount = products[product][1] * quantity,
          region = (day + k) % 4,
          date = new Date(Date.UTC(2026, 8, 24 + day)).toISOString().slice(0, 10);
        orders.push({
          id: 1001 + orders.length,
          region: regions[region],
          product: products[product][0],
          quantity,
          amount,
          date,
        });
        await pool.query("INSERT INTO erp.orders VALUES($1,$2,$3,$4,$5,$6,'paid')", [
          orders.at(-1).id,
          region + 1,
          product + 1,
          quantity,
          amount,
          date,
        ]);
      }
    await pool.query(
      "INSERT INTO erp.orders VALUES(9001,1,1,1,9999,'2026-10-23','pending'),(9002,1,1,1,8888,'2026-09-01','paid'); CREATE VIEW erp.sales_analysis AS SELECT o.id AS order_id,o.order_date,o.quantity,o.amount,o.status,c.id AS customer_id,c.name AS customer_name,p.name AS product_name,r.name AS region FROM erp.orders o JOIN erp.customers c ON c.id=o.customer_id JOIN erp.products p ON p.id=o.product_id JOIN erp.regions r ON r.id=c.region_id; GRANT USAGE ON SCHEMA erp TO eas_source_reader; GRANT SELECT ON erp.sales_analysis TO eas_source_reader;",
    );
  } finally {
    await pool.end();
  }
  const relation = { schema: 'erp', name: 'sales_analysis' },
    endpoint = randomUUID(),
    profile = randomUUID();
  await f.pool.query(
    "INSERT INTO network_endpoints(id,organization_id,name,environment,host,port,allowed_cidrs,tls_server_name,engine,allowed_databases,allowed_relations,tls_mode,local_fixture) VALUES($1,$2,'ERP独立销售测试库','test','127.0.0.1',$3,ARRAY['127.0.0.1/32']::cidr[],'127.0.0.1','postgresql',ARRAY['studio_sales_test'],$4,'disable-fixture',true)",
    [endpoint, f.organizationId, f.postgres.port, JSON.stringify([relation])],
  );
  await f.pool.query(
    "INSERT INTO credential_profiles(id,organization_id,label,engine,environment,secret_ref,allowed_endpoint_ids) VALUES($1,$2,'ERP只读视图账号','postgresql','test','local:sales-reader',$3)",
    [profile, f.organizationId, [endpoint]],
  );
  let source = await call('POST', '/logical-data-sources', {
    key: 'erp_sales',
    name: 'ERP 销售测试数据',
    systemCode: 'ERP',
    engine: 'postgresql',
    department: '销售运营部',
    ownerUserId: f.users.admin,
    sensitivity: 'internal',
    status: 'enabled',
    description: '独立模拟销售库，订单、客户、产品与区域使用确定测试数据。',
  });
  const connection = await call('POST', '/physical-connections', {
    name: 'ERP 销售 · TEST',
    environment: 'test',
    engine: 'postgresql',
    endpointId: endpoint,
    databaseName: 'studio_sales_test',
    credentialProfileId: profile,
    connectTimeoutMs: 2000,
    requestTimeoutMs: 5000,
    poolMax: 2,
    metadataScope: [relation],
  });
  for (const op of ['tests', 'metadata-syncs']) {
    const r = ok(
        await f.call(
          'admin',
          'POST',
          '/physical-connections/' + connection.id + '/' + op,
          op === 'metadata-syncs' ? { relations: [relation] } : undefined,
        ),
        202,
      ),
      job = await waitJob(f, 'admin', r.id);
    if (job.status !== 'succeeded') throw new Error('Sales metadata failed ' + job.failureCode);
  }
  const snapshot = ok(
    await f.call('admin', 'GET', '/physical-connections/' + connection.id + '/metadata'),
  ).items[0];
  await call(
    'PUT',
    '/logical-data-sources/' + source.id + '/mappings?environment=test',
    { physicalConnectionId: connection.id },
    { 'If-Match': '"' + source.revision + '"' },
  );
  const fields = [
    ['order_id', '订单编号', 'integer', false],
    ['order_date', '订单日期', 'date', true],
    ['region', '销售区域', 'string', true],
    ['product_name', '产品类别', 'string', true],
    ['customer_name', '客户名称', 'string', true],
    ['amount', '含税金额（元）', 'number', false],
    ['quantity', '数量', 'integer', false],
    ['status', '支付状态', 'string', true],
  ].map(([key, name, dataType, isDimension]) => ({
    key,
    name,
    physicalColumn: key,
    dataType,
    isDimension,
    classification: 'internal',
    filterable: true,
    description: name,
  }));
  const dimensions = ['order_date', 'region', 'product_name', 'customer_name'];
  const metrics = [
    {
      key: 'sales_total',
      name: '已支付销售额',
      aggregate: 'sum',
      fieldKey: 'amount',
      businessDefinition: '汇总支付状态为 paid 的订单含税金额，单位人民币元。pending 不计入。',
      description: '订单金额已按数量计入，不得再次乘数量。',
      filters: [{ fieldKey: 'status', operator: 'eq', value: 'paid' }],
      availableDimensions: dimensions,
    },
    {
      key: 'order_count',
      name: '已支付订单数',
      aggregate: 'count',
      fieldKey: 'order_id',
      businessDefinition: '按订单主键计数，一个订单只含一个产品。',
      description: '与销售额使用相同 paid 口径。',
      filters: [{ fieldKey: 'status', operator: 'eq', value: 'paid' }],
      availableDimensions: dimensions,
    },
  ];
  let dataset = await call('POST', '/datasets', {
    key: 'erp_sales_analysis',
    name: 'ERP 销售分析',
    logicalDataSourceId: source.id,
    description: '已支付订单的销售趋势、区域表现与产品占比；源视图由管理员审核关联。',
  });
  const semantic = await call('POST', '/datasets/' + dataset.id + '/versions', {
    metadataSnapshotId: snapshot.id,
    relation,
    fields,
    metrics,
    relationships: [],
  });
  dataset = ok(await f.call('admin', 'GET', '/datasets/' + dataset.id));
  await call(
    'PATCH',
    '/datasets/' + dataset.id,
    { name: dataset.name, description: dataset.description, status: 'enabled' },
    { 'If-Match': '"' + dataset.revision + '"' },
  );
  const initialGrants = [];
  for (const user of ['admin', 'developer', 'ai'])
    for (const action of ['dataset.read', 'dataset.query.test'])
      initialGrants.push(
        await call('POST', '/datasets/' + dataset.id + '/grants', {
          principalUserId: f.users[user],
          action,
          fieldKeys: fields.map((f) => f.key),
          metricKeys: metrics.map((m) => m.key),
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        }),
      );
  // Only the interactive local demo opts in. Ordinary integration fixtures retain short-lived grants.
  // Persist precisely the grants just issued; restarting the server never recreates revoked access.
  if (persistentTestAccess) {
    const client = await f.pool.connect();
    try {
      await client.query('BEGIN');
      const renewed = await client.query(
        "UPDATE resource_grants SET expires_at='9999-12-31T00:00:00Z' WHERE organization_id=$1 AND resource_id=$2 AND id=ANY($3::uuid[]) AND action IN ('dataset.read','dataset.query.test') RETURNING id,action,principal_user_id",
        [f.organizationId, dataset.id, initialGrants.map((grant) => grant.id)],
      );
      await client.query(
        "INSERT INTO audit_logs(organization_id,actor_service,action,resource_id,outcome,request_id,safe_metadata) VALUES($1,'local-fixture-bootstrap','local_fixture.test_access.initialize',$2,'allow',$3,$4)",
        [
          f.organizationId,
          dataset.id,
          randomUUID(),
          JSON.stringify({
            environment: 'test',
            expiresAt: '9999-12-31T00:00:00Z',
            grants: renewed.rows,
          }),
        ],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  ok(
    await f.call('admin', 'POST', '/datasets/' + dataset.id + '/query-policies', {
      datasetVersionId: semantic.id,
      organizationFieldKey: null,
      dedicatedSource: true,
      departmentFieldKey: 'region',
      userFieldKey: null,
      fixedFilters: [],
      masks: [],
      requireDatabaseRls: false,
      maxRows: 1000,
      maxExportRows: 10000,
      timeoutMs: 3000,
      maxCost: 100000,
      maxScanRows: 1000000,
      slowQueryMs: 1000,
    }),
  );
  for (const user of ['admin', 'developer', 'ai'])
    ok(
      await f.call(
        'admin',
        'POST',
        '/organizations/' + f.organizationId + '/members/' + f.users[user] + '/data-scope',
        { departmentCodes: regions },
      ),
    );
  const refs = [{ datasetId: dataset.id, datasetVersionId: semantic.id }],
    app = ok(
      await f.call('developer', 'POST', '/apps', {
        key: 'sales_insights',
        name: '销售经营分析',
        type: 'REPORT',
        description: '从最近30天的订单，理解增长与区域结构。',
        datasetRefs: refs,
        workspaceId: 'sales-analysis',
      }),
      201,
    );
  const report = ok(
    await f.call('developer', 'POST', '/reports', {
      appId: app.id,
      key: 'sales_overview',
      name: '销售经营分析',
    }),
    201,
  );
  const range = {
    fieldKey: 'order_date',
    from: '2026-09-24T00:00:00Z',
    to: '2026-10-24T00:00:00Z',
  };
  const query = (metrics, dimensions, orderBy = []) => ({
    datasetId: dataset.id,
    datasetVersionId: semantic.id,
    metrics,
    dimensions,
    groupBy: dimensions,
    filters: [],
    orderBy,
    limit: 1000,
    timeRange: range,
  });
  const queries = [
    { key: 'summary', query: query(['sales_total', 'order_count'], []) },
    {
      key: 'trend',
      query: query(['sales_total'], ['order_date'], [{ key: 'order_date', direction: 'asc' }]),
    },
    {
      key: 'regions',
      query: query(['sales_total'], ['region'], [{ key: 'sales_total', direction: 'desc' }]),
    },
    {
      key: 'products',
      query: query(['sales_total'], ['product_name'], [{ key: 'sales_total', direction: 'desc' }]),
    },
  ];
  const chart = (id, title, type, queryKey, valueKey, span, categoryKey) => ({
    id,
    title,
    type,
    queryKey,
    valueKey,
    span,
    format: valueKey === 'order_count' ? 'number' : 'currency',
    ...(categoryKey ? { categoryKey } : {}),
  });
  const config = {
    schemaVersion: '1.0',
    reportId: report.id,
    title: '销售经营分析',
    datasetRefs: refs,
    metrics: ['sales_total', 'order_count'],
    dimensions: ['order_date', 'region', 'product_name'],
    filters: [
      { key: 'period', label: '统计日期', fieldKey: 'order_date', type: 'dateRange', options: [] },
      {
        key: 'region_filter',
        label: '销售区域',
        fieldKey: 'region',
        type: 'select',
        options: regions,
      },
    ],
    queries,
    chartDefinitions: [
      chart('revenue', '已支付销售额', 'metric', 'summary', 'sales_total', 6),
      chart('orders', '已支付订单数', 'metric', 'summary', 'order_count', 6),
      chart('trend_chart', '近 30 天销售趋势', 'line', 'trend', 'sales_total', 12, 'order_date'),
      chart('region_ranking', '区域销售排名', 'ranking', 'regions', 'sales_total', 6, 'region'),
      chart('product_share', '产品销售占比', 'pie', 'products', 'sales_total', 6, 'product_name'),
    ],
    layout: { columns: 12, gap: 20 },
    theme: 'studio-light',
    refreshPolicy: { mode: 'manual', intervalSeconds: 300 },
    notes: [
      '仅统计已支付订单；金额为含税人民币元，订单金额已包含购买数量。',
      '日期包含开始日和结束日，数据库查询使用次日零点为右开区间。',
      '本例统计基准日为2026-10-23，最近30天为2026-09-24至2026-10-23。',
      '跨表关联由管理员批准的视图提供；网关不接受客户端JOIN或任意SQL。',
    ],
  };
  const manifest = {
    schemaVersion: '1.0',
    entrypoint: 'src/main.tsx',
    datasetRefs: refs,
    queries,
    report: config,
  };
  const sourceCode = `import {createRoot} from 'react-dom/client';\nimport {ReportView} from '@eas/report-ui';\nimport {query} from '@eas/platform-sdk/runtime';\nimport '@eas/report-ui/style.css';\nimport type {components} from '@eas/api-contract';\nimport type {ComponentProps} from 'react';\nconst config:components['schemas']['ReportDefinition']=${JSON.stringify(config)};\nconst execute:ComponentProps<typeof ReportView>['execute']=(key,filters,range,signal)=>query(key,filters,range,signal);\nconst root=document.getElementById('root');if(!root)throw new Error('ROOT_REQUIRED');createRoot(root).render(<ReportView config={config} execute={execute}/>);\n`;
  const upload = {
    manifest,
    files: [
      { path: 'src/main.tsx', content: sourceCode },
      {
        path: 'README.md',
        content:
          'Harness generated React source. Real TEST data arrives only through the platform bridge.',
      },
    ],
    message: '最近30天销售分析 · 初始源码',
  };
  await mkdir('work/sales-analysis/src', { recursive: true });
  await writeFile('work/sales-analysis/src/main.tsx', sourceCode);
  await writeFile('work/sales-analysis/studio.manifest.json', JSON.stringify(manifest, null, 2));
  const savedReport = ok(
      await f.call('developer', 'POST', '/reports/' + report.id + '/versions', { config }),
      201,
    ),
    version = ok(await f.call('developer', 'POST', '/apps/' + app.id + '/versions', upload), 201),
    build = ok(await f.call('developer', 'POST', '/app-versions/' + version.id + '/builds'), 202);
  let buildResult;
  for (let i = 0; i < 180; i++) {
    buildResult = ok(await f.call('developer', 'GET', '/build-jobs/' + build.id));
    if (['succeeded', 'failed'].includes(buildResult.status)) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  if (buildResult.status !== 'succeeded')
    throw new Error('Real compile failed: ' + JSON.stringify(buildResult));
  return {
    dataset,
    semantic,
    app,
    report,
    reportVersion: savedReport,
    version,
    build: buildResult,
    config,
    manifest,
    upload,
    orders,
    expected: {
      total: orders.reduce((s, o) => s + o.amount, 0),
      count: orders.length,
      regions: Object.fromEntries(
        regions.map((r) => [
          r,
          orders.filter((o) => o.region === r).reduce((s, o) => s + o.amount, 0),
        ]),
      ),
      products: Object.fromEntries(
        products.map(([p]) => [
          p,
          orders.filter((o) => o.product === p).reduce((s, o) => s + o.amount, 0),
        ]),
      ),
    },
  };
}
