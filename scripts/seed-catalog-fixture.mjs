import { waitJob } from './catalog-fixture.mjs';
export async function seedCatalogFixture(f) {
  const call = async (method, path, body, headers = {}) => {
    const response = await f.call('admin', method, path, body, headers);
    if (response.status >= 400)
      throw new Error('Seed request failed: ' + JSON.stringify(response.body));
    return response.body;
  };
  const base = { ownerUserId: f.users.admin, sensitivity: 'internal', status: 'enabled' };
  const operations = await call('POST', '/logical-data-sources', {
    ...base,
    key: 'ops_warehouse',
    name: '运营分析系统',
    systemCode: 'OPS',
    engine: 'postgresql',
    department: '运营中心',
    description: '业务运营与服务表现的数据目录',
    status: 'disabled',
  });
  const finance = await call('POST', '/logical-data-sources', {
    ...base,
    key: 'finance_erp',
    name: '财务核算系统',
    systemCode: 'FIN',
    engine: 'sqlserver',
    department: '财务管理部',
    description: '财务核算与费用管理，连接待 IT 配置',
    sensitivity: 'restricted',
  });
  const crm = await call('POST', '/logical-data-sources', {
    ...base,
    key: 'customer_crm',
    name: '客户关系系统',
    systemCode: 'CRM',
    engine: 'mysql',
    department: '客户运营部',
    description: '客户服务与业务协同，连接待 IT 配置',
  });
  let sales = await call('POST', '/logical-data-sources', {
    ...base,
    key: 'sales_system',
    name: '销售业务系统',
    systemCode: 'SALES',
    engine: 'postgresql',
    department: '销售运营部',
    description: '统一维护销售订单、客户与区域业绩，提供可解释的业务指标。',
  });
  const connection = await call('POST', '/physical-connections', {
    name: '销售数据 · TEST',
    environment: 'test',
    engine: 'postgresql',
    endpointId: f.endpointId,
    databaseName: 'source_test',
    credentialProfileId: f.profileId,
    connectTimeoutMs: 2000,
    requestTimeoutMs: 5000,
    poolMax: 2,
    metadataScope: f.relations,
  });
  for (const operation of ['tests', 'metadata-syncs']) {
    const initial = await call(
      'POST',
      '/physical-connections/' + connection.id + '/' + operation,
      operation === 'metadata-syncs' ? { relations: f.relations } : undefined,
    );
    const result = await waitJob(f, 'admin', initial.id);
    if (result.status !== 'succeeded')
      throw new Error('Fixture ' + operation + ' failed: ' + result.failureCode);
  }
  const snapshot = (await call('GET', '/physical-connections/' + connection.id + '/metadata'))
    .items[0];
  await call(
    'PUT',
    '/logical-data-sources/' + sales.id + '/mappings?environment=test',
    { physicalConnectionId: connection.id },
    { 'If-Match': '"' + sales.revision + '"' },
  );
  sales = await call('GET', '/logical-data-sources/' + sales.id);
  const field = (key, name, physicalColumn, dataType, isDimension = false) => ({
    key,
    name,
    physicalColumn,
    dataType,
    isDimension,
    classification: 'internal',
    filterable: true,
    description: name,
  });
  const createDataset = async (
    key,
    name,
    description,
    relation,
    fields,
    metrics,
    relationships = [],
  ) => {
    let d = await call('POST', '/datasets', {
      key,
      name,
      logicalDataSourceId: sales.id,
      description,
    });
    const version = await call('POST', '/datasets/' + d.id + '/versions', {
      metadataSnapshotId: snapshot.id,
      relation: { schema: 'sales', name: relation },
      fields,
      metrics,
      relationships,
    });
    d = await call('GET', '/datasets/' + d.id);
    d = await call(
      'PATCH',
      '/datasets/' + d.id,
      { name, description, status: 'enabled' },
      { 'If-Match': '"' + d.revision + '"' },
    );
    for (const action of ['dataset.read', 'dataset.query.test'])
      await call('POST', '/datasets/' + d.id + '/grants', {
        principalUserId: f.users.developer,
        action,
        expiresAt: new Date(Date.now() + 30 * 86400_000).toISOString(),
        fieldKeys: fields.map((f) => f.key),
        metricKeys: metrics.map((m) => m.key),
      });
    for (const action of ['dataset.read', 'dataset.query.test'])
      await call('POST', '/datasets/' + d.id + '/grants', {
        principalUserId: f.users.admin,
        action,
        expiresAt: new Date(Date.now() + 30 * 86400_000).toISOString(),
        fieldKeys: fields.map((f) => f.key),
        metricKeys: metrics.map((m) => m.key),
      });
    await call('POST', '/datasets/' + d.id + '/query-policies', {
      datasetVersionId: version.id,
      organizationFieldKey: null,
      dedicatedSource: true,
      departmentFieldKey: relation === 'orders' ? 'region' : null,
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
    });
    return { dataset: d, version };
  };
  const customers = await createDataset(
    'customer_directory',
    '客户基础信息',
    '统一的客户标识与名称，供订单关系引用。',
    'customers',
    [
      field('customer_id', '客户编号', 'id', 'integer'),
      field('customer_name', '客户名称', 'name', 'string', true),
    ],
    [],
  );
  const orders = await createDataset(
    'sales_orders',
    '销售订单分析',
    '围绕销售区域、支付状态与含税金额，建立一致的订单分析口径。',
    'orders',
    [
      field('order_id', '订单编号', 'id', 'integer'),
      field('customer_id', '客户编号', 'customer_id', 'integer'),
      field('region', '销售区域', 'region', 'string', true),
      field('amount', '含税金额', 'amount', 'number'),
      field('order_date', '订单日期', 'order_date', 'date', true),
      field('status', '支付状态', 'status', 'string', true),
    ],
    [
      {
        key: 'sales_total',
        name: '已支付销售额',
        aggregate: 'sum',
        fieldKey: 'amount',
        businessDefinition: '汇总支付状态为 paid 的订单含税金额，单位为元。不包含待支付订单。',
        description: '用于区域销售表现和日常业务复盘。',
        filters: [{ fieldKey: 'status', operator: 'eq', value: 'paid' }],
        availableDimensions: ['region', 'order_date'],
      },
      {
        key: 'paid_order_count',
        name: '已支付订单数',
        aggregate: 'count',
        fieldKey: 'order_id',
        businessDefinition: '统计支付状态为 paid、订单编号非空的订单数量。',
        description: '与已支付销售额采用一致的状态范围。',
        filters: [{ fieldKey: 'status', operator: 'eq', value: 'paid' }],
        availableDimensions: ['region', 'order_date'],
      },
    ],
    [
      {
        key: 'order_customer',
        targetDatasetVersionId: customers.version.id,
        sourceFieldKey: 'customer_id',
        targetFieldKey: 'customer_id',
        cardinality: 'many-to-one',
        description: '每笔订单关联一位客户；同一客户可对应多笔订单。',
      },
    ],
  );
  for (const user of ['admin', 'developer'])
    await call(
      'POST',
      '/organizations/' + f.organizationId + '/members/' + f.users[user] + '/data-scope',
      { departmentCodes: ['华东', '华南'] },
    );
  return { sales, connection, snapshot, orders, customers, crm, finance, operations };
}
