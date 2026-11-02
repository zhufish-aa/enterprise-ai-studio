import { randomUUID } from 'node:crypto';
import { createCatalogFixture, waitJob } from './catalog-fixture.mjs';
export async function createGatewayFixture() {
  const f = await createCatalogFixture();
  try {
    const call = async (name, method, path, body, headers = {}) => {
      const r = await f.call(name, method, path, body, headers);
      if (r.status >= 400)
        throw new Error('Fixture API failed: ' + r.status + ' ' + JSON.stringify(r.body));
      return r.body;
    };
    await f.sourcePool
      .query(`CREATE TABLE sales.secure_orders(id integer PRIMARY KEY,organization_id text NOT NULL,department_code text NOT NULL,owner_user_id text NOT NULL,email text NOT NULL,amount numeric(12,2) NOT NULL,occurred_at timestamptz NOT NULL,status text NOT NULL);
   ALTER TABLE sales.secure_orders ENABLE ROW LEVEL SECURITY;ALTER TABLE sales.secure_orders FORCE ROW LEVEL SECURITY;
   CREATE POLICY secured_source_rows ON sales.secure_orders TO eas_source_reader USING(organization_id=current_setting('eas.organization_id',true) AND department_code IN(SELECT jsonb_array_elements_text(coalesce(nullif(current_setting('eas.department_codes',true),''),'[]')::jsonb)));
   GRANT SELECT ON sales.secure_orders TO eas_source_reader;
   CREATE VIEW sales.slow_records WITH(security_invoker=true) AS SELECT id,organization_id,department_code,owner_user_id,email,amount+CASE WHEN pg_sleep(2) IS NULL THEN 0 ELSE 0 END AS amount,occurred_at,status FROM sales.secure_orders;
   CREATE TABLE sales.large_records AS SELECT id*10000+g AS id,organization_id,department_code,owner_user_id,email,amount,occurred_at,status FROM sales.secure_orders CROSS JOIN generate_series(1,6000) g;
   ALTER TABLE sales.large_records ADD PRIMARY KEY(id);
   GRANT SELECT ON sales.slow_records,sales.large_records TO eas_source_reader;`);
    const rows = [
      [
        1,
        f.organizationId,
        'east',
        f.users.developer,
        'east-one@company.test',
        120,
        '2026-10-01',
        'paid',
      ],
      [
        2,
        f.organizationId,
        'east',
        f.users.admin,
        'east-two@company.test',
        80,
        '2026-10-05',
        'paid',
      ],
      [
        3,
        f.organizationId,
        'west',
        f.users.limited,
        'west-private@company.test',
        900,
        '2026-10-07',
        'paid',
      ],
      [
        4,
        f.otherOrganizationId,
        'east',
        f.users.outsider,
        'other-org-secret@company.test',
        9999,
        '2026-10-08',
        'paid',
      ],
    ];
    for (const row of rows)
      await f.sourcePool.query(
        'INSERT INTO sales.secure_orders VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
        row,
      );
    await f.sourcePool.query(
      'INSERT INTO sales.large_records SELECT id*10000+g AS id,organization_id,department_code,owner_user_id,email,amount,occurred_at,status FROM sales.secure_orders CROSS JOIN generate_series(1,6000) g; ANALYZE sales.large_records;',
    );
    const relations = [
      ...f.relations,
      ...['secure_orders', 'slow_records', 'large_records'].map((name) => ({
        schema: 'sales',
        name,
      })),
    ];
    await f.pool.query('UPDATE network_endpoints SET allowed_relations=$2 WHERE id=$1', [
      f.endpointId,
      JSON.stringify(relations),
    ]);
    const source = await call('admin', 'POST', '/logical-data-sources', {
      key: 'secure_gateway',
      name: '安全网关测试源',
      systemCode: 'SECURE',
      engine: 'postgresql',
      description: '合成组织与部门数据',
      department: 'IT',
      ownerUserId: f.users.admin,
      sensitivity: 'sensitive',
      status: 'enabled',
    });
    const connection = await call('admin', 'POST', '/physical-connections', {
      name: '网关TEST',
      environment: 'test',
      engine: 'postgresql',
      endpointId: f.endpointId,
      databaseName: 'source_test',
      credentialProfileId: f.profileId,
      connectTimeoutMs: 1000,
      requestTimeoutMs: 5000,
      poolMax: 2,
      metadataScope: relations,
    });
    for (const action of ['tests', 'metadata-syncs']) {
      const j = await call(
        'admin',
        'POST',
        '/physical-connections/' + connection.id + '/' + action,
        action === 'metadata-syncs' ? { relations } : undefined,
      );
      if ((await waitJob(f, 'admin', j.id)).status !== 'succeeded')
        throw new Error('Gateway fixture metadata failed');
    }
    const snapshot = (
      await call('admin', 'GET', '/physical-connections/' + connection.id + '/metadata')
    ).items[0];
    await call(
      'admin',
      'PUT',
      '/logical-data-sources/' + source.id + '/mappings?environment=test',
      { physicalConnectionId: connection.id },
      { 'If-Match': '"' + source.revision + '"' },
    );
    const fields = [
      ['order_id', 'id', 'integer', false],
      ['organization_key', 'organization_id', 'string', true],
      ['department_key', 'department_code', 'string', true],
      ['owner_key', 'owner_user_id', 'string', true],
      ['email', 'email', 'string', false],
      ['amount', 'amount', 'number', false],
      ['occurred_at', 'occurred_at', 'datetime', true],
      ['status', 'status', 'string', true],
    ].map(([key, physicalColumn, dataType, isDimension]) => ({
      key,
      name: key,
      physicalColumn,
      dataType,
      isDimension,
      filterable: true,
      classification: key === 'email' ? 'sensitive' : 'internal',
      description: key,
    }));
    const policyBase = {
      organizationFieldKey: 'organization_key',
      dedicatedSource: false,
      departmentFieldKey: 'department_key',
      userFieldKey: null,
      fixedFilters: [],
      masks: [{ fieldKey: 'email', mode: 'last4' }],
      requireDatabaseRls: true,
      maxRows: 1000,
      maxExportRows: 1500,
      timeoutMs: 1000,
      maxCost: 100000,
      maxScanRows: 1000000,
      slowQueryMs: 1,
    };
    const datasets = {};
    for (const relation of ['secure_orders', 'slow_records', 'large_records']) {
      let d = await call('admin', 'POST', '/datasets', {
        key: relation,
        name: relation,
        logicalDataSourceId: source.id,
        description: '实际数据库网关验收',
      });
      const v = await call('admin', 'POST', '/datasets/' + d.id + '/versions', {
        metadataSnapshotId: snapshot.id,
        relation: { schema: 'sales', name: relation },
        fields,
        metrics: [
          {
            key: 'paid_total',
            name: '已支付金额',
            aggregate: 'sum',
            fieldKey: 'amount',
            businessDefinition: '已支付订单金额',
            description: '合成测试',
            filters: [{ fieldKey: 'status', operator: 'eq', value: 'paid' }],
            availableDimensions: ['department_key', 'occurred_at'],
          },
        ],
        relationships: [],
      });
      d = await call('admin', 'GET', '/datasets/' + d.id);
      d = await call(
        'admin',
        'PATCH',
        '/datasets/' + d.id,
        { name: d.name, description: d.description, status: 'enabled' },
        { 'If-Match': '"' + d.revision + '"' },
      );
      const policy = await call('admin', 'POST', '/datasets/' + d.id + '/query-policies', {
        ...policyBase,
        datasetVersionId: v.id,
        requireDatabaseRls: relation === 'secure_orders',
      });
      const grants = {};
      for (const user of ['developer', 'limited', 'admin']) {
        if (user === 'limited') {
          const role = (
            await f.pool.query(
              'SELECT role_id FROM role_bindings WHERE organization_id=$1 AND user_id=$2',
              [f.organizationId, f.users.limited],
            )
          ).rows[0].role_id;
          for (const permission of [
            'dataset.query.production',
            'dataset.export',
            'app.view',
            'report.view',
          ])
            await f.pool.query(
              'INSERT INTO role_permissions(organization_id,role_id,permission_key) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',
              [f.organizationId, role, permission],
            );
        }
        grants[user] = {};
        for (const action of ['dataset.read', 'dataset.query.test'])
          grants[user][action] = await call('admin', 'POST', '/datasets/' + d.id + '/grants', {
            principalUserId: f.users[user],
            action,
            expiresAt: new Date(Date.now() + 86400000).toISOString(),
            fieldKeys: fields.map((f) => f.key),
            metricKeys: ['paid_total'],
          });
      }
      datasets[relation] = { dataset: d, version: v, policy, grants };
    }
    for (const [user, departments] of [
      ['developer', ['east']],
      ['limited', ['west']],
      ['admin', ['east', 'west']],
    ])
      await call(
        'admin',
        'POST',
        '/organizations/' + f.organizationId + '/members/' + f.users[user] + '/data-scope',
        { departmentCodes: departments },
      );
    const query = (relation = 'secure_orders', patch = {}) => ({
      datasetId: datasets[relation].dataset.id,
      datasetVersionId: datasets[relation].version.id,
      metrics: [],
      dimensions: ['order_id', 'department_key', 'email', 'amount'],
      filters: [],
      groupBy: [],
      orderBy: [{ key: 'order_id', direction: 'asc' }],
      limit: 100,
      ...patch,
    });
    return {
      ...f,
      datasets,
      fields,
      source,
      connection,
      query,
      policyBase,
      async grant(
        user,
        action,
        fieldKeys = fields.map((f) => f.key),
        metricKeys = ['paid_total'],
        relation = 'secure_orders',
      ) {
        return call('admin', 'POST', '/datasets/' + datasets[relation].dataset.id + '/grants', {
          principalUserId: f.users[user],
          action,
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          fieldKeys,
          metricKeys,
        });
      },
    };
  } catch (e) {
    await f.close();
    throw e;
  }
}
export async function waitQuery(f, user, id) {
  for (let i = 0; i < 180; i++) {
    const r = await f.call(user, 'GET', '/query-jobs/' + id);
    if (r.status !== 200)
      throw new Error('Query status ' + r.status + ' ' + JSON.stringify(r.body));
    if (['succeeded', 'failed', 'cancelled'].includes(r.body.status)) return r.body;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('Query wait exceeded 18 seconds');
}
