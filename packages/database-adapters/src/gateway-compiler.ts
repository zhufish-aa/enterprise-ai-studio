import type { GatewayPlan, components } from '@eas/api-contract';
import { placeholder, quote } from './metadata.js';
import { AdapterError } from './network.js';
type S = components['schemas'];
export function compileGateway(plan: GatewayPlan) {
  const q = plan.query,
    engine = plan.connection.engine,
    values: unknown[] = [],
    fields = new Map(plan.model.fields.map((f) => [f.key, f])),
    metrics = new Map(plan.model.metrics.map((m) => [m.key, m])),
    masks = new Map(plan.masks.map((m) => [m.fieldKey, m.mode]));
  const deny = (): never => {
    throw new AdapterError('QUERY_REJECTED');
  };
  if (
    !Number.isSafeInteger(plan.rowLimit) ||
    plan.rowLimit < 0 ||
    !Number.isSafeInteger(plan.rowLimit + 1) ||
    !Number.isSafeInteger(plan.offset) ||
    plan.offset < 0 ||
    (plan.rowLimit === 0 && plan.offset !== 0)
  )
    deny();
  const field = (key: string) => {
    const f = fields.get(key);
    return f ? quote(engine, f.physicalColumn) : deny();
  };
  const param = (value: unknown) => {
    values.push(value);
    return placeholder(engine, values.length - 1);
  };
  const condition = (f: S['Filter']) => {
    const column = field(f.fieldKey),
      v = f.value;
    if (f.operator === 'in')
      return Array.isArray(v) && v.length > 0 && v.length <= 100
        ? column + ' IN (' + v.map(param).join(',') + ')'
        : deny();
    if (f.operator === 'between')
      return Array.isArray(v) && v.length === 2
        ? column + ' BETWEEN ' + param(v[0]) + ' AND ' + param(v[1])
        : deny();
    const op = { eq: '=', ne: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=' }[f.operator];
    return op && !Array.isArray(v) ? column + ' ' + op + ' ' + param(v) : deny();
  };
  const selected: string[] = [],
    columns: S['QueryResult']['columns'] = [];
  for (const k of q.dimensions) {
    const f = fields.get(k);
    if (!f) deny();
    let expression = field(k);
    const mask = masks.get(k);
    if (mask) {
      if (
        q.metrics.length ||
        q.groupBy.includes(k) ||
        q.orderBy.some((o) => o.key === k) ||
        q.filters.some((x) => x.fieldKey === k) ||
        q.timeRange?.fieldKey === k
      )
        deny();
      expression =
        mask === 'redact'
          ? 'NULL'
          : 'CASE WHEN ' +
            expression +
            " IS NULL THEN NULL ELSE CONCAT('***',RIGHT(CAST(" +
            expression +
            ' AS ' +
            (engine === 'postgresql' ? 'text' : engine === 'mysql' ? 'CHAR' : 'nvarchar(max)') +
            '),4)) END';
    }
    selected.push(expression + ' AS ' + quote(engine, k));
    columns.push({ key: k, dataType: mask ? 'string' : f!.dataType, masked: !!mask });
  }
  for (const k of q.metrics) {
    const m = metrics.get(k);
    if (!m || masks.has(m.fieldKey) || m.filters.some((f) => masks.has(f.fieldKey))) deny();
    let expression = field(m!.fieldKey);
    if (m!.filters.length)
      expression =
        'CASE WHEN ' +
        m!.filters.map(condition).join(' AND ') +
        ' THEN ' +
        expression +
        ' ELSE NULL END';
    const aggregate = {
      sum: 'SUM',
      avg: 'AVG',
      count: 'COUNT',
      countDistinct: 'COUNT',
      min: 'MIN',
      max: 'MAX',
    }[m!.aggregate];
    if (!aggregate) deny();
    selected.push(
      aggregate +
        '(' +
        (m!.aggregate === 'countDistinct' ? 'DISTINCT ' : '') +
        expression +
        ') AS ' +
        quote(engine, k),
    );
    columns.push({
      key: k,
      dataType: ['min', 'max'].includes(m!.aggregate)
        ? (fields.get(m!.fieldKey)?.dataType ?? 'string')
        : 'number',
      masked: false,
    });
  }
  if (!selected.length || new Set(columns.map((c) => c.key)).size !== columns.length) deny();
  const where = [...plan.rowFilters, ...q.filters];
  if (q.timeRange)
    where.push(
      { fieldKey: q.timeRange.fieldKey, operator: 'gte', value: q.timeRange.from },
      { fieldKey: q.timeRange.fieldKey, operator: 'lt', value: q.timeRange.to },
    );
  const group =
    q.metrics.length && q.groupBy.length ? ' GROUP BY ' + q.groupBy.map(field).join(',') : '';
  const order = q.orderBy.map((o) => {
    if (
      !columns.some((c) => c.key === o.key) ||
      masks.has(o.key) ||
      !['asc', 'desc'].includes(o.direction)
    )
      deny();
    return quote(engine, o.key) + ' ' + o.direction.toUpperCase();
  });
  for (const key of q.dimensions)
    if (!masks.has(key) && !q.orderBy.some((o) => o.key === key))
      order.push(quote(engine, key) + ' ASC');
  if (engine === 'sqlserver' && !order.length) order.push('(SELECT NULL)');
  const predicate = where.length ? ' WHERE ' + where.map(condition).join(' AND ') : '';
  const page =
    plan.rowLimit === 0
      ? ''
      : engine === 'sqlserver'
        ? ' OFFSET ' +
          param(plan.offset) +
          ' ROWS FETCH NEXT ' +
          param(plan.rowLimit + 1) +
          ' ROWS ONLY'
        : ' LIMIT ' + param(plan.rowLimit + 1) + ' OFFSET ' + param(plan.offset);
  const overflowKeys: string[] = [],
    projection = columns.flatMap((c, i) => {
      const name = quote(engine, c.key);
      if (c.dataType !== 'string' || c.masked) return [name];
      const cast =
          'CAST(' +
          name +
          ' AS ' +
          (engine === 'postgresql' ? 'text' : engine === 'mysql' ? 'CHAR' : 'nvarchar(max)') +
          ')',
        overflow = '_eas_oversize_' + i;
      overflowKeys.push(overflow);
      return [
        'LEFT(' + cast + ',32768) AS ' + name,
        'CASE WHEN ' +
          (engine === 'sqlserver' ? 'DATALENGTH' : 'OCTET_LENGTH') +
          '(' +
          cast +
          ')>32768 THEN 1 ELSE 0 END AS ' +
          quote(engine, overflow),
      ];
    });
  const inner =
    'SELECT ' +
    selected.join(',') +
    ' FROM ' +
    quote(engine, plan.model.relation.schema) +
    '.' +
    quote(engine, plan.model.relation.name) +
    predicate +
    group;
  return {
    text:
      'SELECT ' +
      projection.join(',') +
      ' FROM (' +
      inner +
      ') AS ' +
      quote(engine, '_eas_data') +
      (order.length ? ' ORDER BY ' + order.join(',') : '') +
      page,
    values,
    columns,
    overflowKeys,
  };
}
