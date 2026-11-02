import type { CatalogPlan, components } from '@eas/api-contract';
import { placeholder, quote } from './metadata.js';
import { AdapterError } from './network.js';
type Filter = components['schemas']['Filter'];
export function compilePreview(plan: CatalogPlan): {
  text: string;
  values: unknown[];
  keys: string[];
  types: string[];
  limit: number;
} {
  const p = plan.preview;
  if (
    plan.operation !== 'preview' ||
    plan.environment !== 'test' ||
    !p ||
    !Number.isInteger(p.limit) ||
    p.limit < 1 ||
    p.limit > 100
  )
    throw new AdapterError('RELATION_FORBIDDEN');
  const engine = plan.connection.engine,
    values: unknown[] = [],
    fields = new Map(p.fields.map((f) => [f.key, f]));
  const field = (key: string) => {
    const f = fields.get(key);
    if (!f) throw new AdapterError('RELATION_FORBIDDEN');
    return quote(engine, f.physicalColumn);
  };
  const param = (v: unknown) => {
    values.push(v);
    return placeholder(engine, values.length - 1);
  };
  const filter = (f: Filter) => {
    const definition = fields.get(f.fieldKey);
    if (!definition?.filterable) throw new AdapterError('RELATION_FORBIDDEN');
    const column = field(f.fieldKey),
      v = f.value;
    if (f.operator === 'in') {
      if (!Array.isArray(v) || !v.length || v.length > 100)
        throw new AdapterError('RELATION_FORBIDDEN');
      return column + ' IN (' + v.map(param).join(',') + ')';
    }
    if (f.operator === 'between') {
      if (!Array.isArray(v) || v.length !== 2) throw new AdapterError('RELATION_FORBIDDEN');
      return column + ' BETWEEN ' + param(v[0]) + ' AND ' + param(v[1]);
    }
    const op = { eq: '=', ne: '<>', lt: '<', lte: '<=', gt: '>', gte: '>=' }[f.operator];
    if (!op || Array.isArray(v)) throw new AdapterError('RELATION_FORBIDDEN');
    return column + ' ' + op + ' ' + param(v);
  };
  const metrics = new Map(p.metrics.map((m) => [m.key, m]));
  const dimensions = p.dimensions.length
    ? p.dimensions
    : p.metricKeys.length
      ? []
      : p.fields.map((f) => f.key);
  if (new Set([...dimensions, ...p.metricKeys]).size !== dimensions.length + p.metricKeys.length)
    throw new AdapterError('RELATION_FORBIDDEN');
  if (p.metricKeys.length && dimensions.some((k) => !fields.get(k)?.isDimension))
    throw new AdapterError('RELATION_FORBIDDEN');
  const select = dimensions.map((k) => field(k) + ' AS ' + quote(engine, k)),
    types = dimensions.map((k) => fields.get(k)?.dataType ?? 'string');
  for (const metricKey of p.metricKeys) {
    const m = metrics.get(metricKey);
    if (!m || dimensions.some((k) => !m.availableDimensions.includes(k)))
      throw new AdapterError('RELATION_FORBIDDEN');
    let expression = field(m.fieldKey);
    if (m.filters.length)
      expression =
        'CASE WHEN ' +
        m.filters.map(filter).join(' AND ') +
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
    }[m.aggregate];
    if (!aggregate) throw new AdapterError('RELATION_FORBIDDEN');
    select.push(
      aggregate +
        '(' +
        (m.aggregate === 'countDistinct' ? 'DISTINCT ' : '') +
        expression +
        ') AS ' +
        quote(engine, m.key),
    );
    types.push('number');
  }
  if (!select.length) throw new AdapterError('RELATION_FORBIDDEN');
  const where = p.filters.length ? ' WHERE ' + p.filters.map(filter).join(' AND ') : '';
  const group =
    p.metricKeys.length && dimensions.length ? ' GROUP BY ' + dimensions.map(field).join(',') : '';
  const text =
    'SELECT ' +
    (engine === 'sqlserver' ? 'TOP (' + (p.limit + 1) + ') ' : '') +
    select.join(',') +
    ' FROM ' +
    quote(engine, p.relation.schema) +
    '.' +
    quote(engine, p.relation.name) +
    where +
    group +
    (engine === 'sqlserver' ? '' : ' LIMIT ' + (p.limit + 1));
  return { text, values, keys: [...dimensions, ...p.metricKeys], types, limit: p.limit };
}
