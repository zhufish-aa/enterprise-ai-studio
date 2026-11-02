import { useEffect, useState, type FormEvent } from 'react';
import { Api, type S } from './api.js';
import { Button, Dialog, Field, ErrorBanner, Loading, Empty, IconButton } from './components.js';
import { Icon } from './icons.js';
type DraftField = S['DatasetField'] & { selected: boolean };
type DraftFilter = { fieldKey: string; operator: S['Filter']['operator']; value: string };
type DraftMetric = Omit<S['MetricDefinition'], 'filters'> & { filters: DraftFilter[] };
const fieldType = (type: string): S['DatasetField']['dataType'] => {
  if (/^(smallint|integer|bigint|int\b|tinyint|mediumint|serial|bigserial)/i.test(type))
    return 'integer';
  if (/numeric|decimal|real|double|float|money/i.test(type)) return 'number';
  if (/bool|^bit$/i.test(type)) return 'boolean';
  if (/^date$/i.test(type)) return 'date';
  if (/timestamp|datetime/i.test(type)) return 'datetime';
  return 'string';
};
const keyFor = (column: S['ColumnMetadata']) =>
  /^[a-z][a-z0-9_]{1,62}$/.test(column.name) ? column.name : 'field_' + column.ordinal;
const fieldsFor = (r: S['RelationMetadata']): DraftField[] =>
  r.columns.map((c) => ({
    key: keyFor(c),
    name: c.comment || c.name,
    physicalColumn: c.name,
    dataType: fieldType(c.dbType),
    classification: 'internal',
    filterable: true,
    isDimension: fieldType(c.dbType) === 'string' || fieldType(c.dbType) === 'date',
    description: c.comment,
    selected: true,
  }));
const draftFilter = (f: S['Filter']): DraftFilter => ({
  fieldKey: f.fieldKey,
  operator: f.operator,
  value: Array.isArray(f.value) ? f.value.join(', ') : String(f.value),
});
function parseFilter(filter: DraftFilter, fields: S['DatasetField'][]): S['Filter'] {
  const field = fields.find((f) => f.key === filter.fieldKey);
  if (!field || !field.filterable) throw new Error('过滤字段必须包含在允许过滤的业务字段中。');
  const scalar = (value: string): string | number | boolean => {
    if (['integer', 'number'].includes(field.dataType)) {
      if (!value.trim() || !Number.isFinite(Number(value)))
        throw new Error('数值字段的过滤值必须是有效数字。');
      return Number(value);
    }
    if (field.dataType === 'boolean') {
      if (!['true', 'false'].includes(value))
        throw new Error('布尔字段的过滤值应为 true 或 false。');
      return value === 'true';
    }
    return value;
  };
  return {
    fieldKey: filter.fieldKey,
    operator: filter.operator,
    value: ['in', 'between'].includes(filter.operator)
      ? filter.value.split(',').map((v) => scalar(v.trim()))
      : scalar(filter.value),
  };
}
export function FilterEditor({
  filters,
  fields,
  onChange,
}: {
  filters: DraftFilter[];
  fields: S['DatasetField'][];
  onChange: (filters: DraftFilter[]) => void;
}) {
  const update = (index: number, value: Partial<DraftFilter>) =>
    onChange(filters.map((f, i) => (i === index ? { ...f, ...value } : f)));
  return (
    <div className="filter-editor">
      {filters.map((f, i) => (
        <div className="filter-row" key={i}>
          <select
            aria-label={'过滤字段 ' + (i + 1)}
            value={f.fieldKey}
            onChange={(e) => update(i, { fieldKey: e.target.value })}
          >
            <option value="">选择字段</option>
            {fields
              .filter((f) => f.filterable)
              .map((field) => (
                <option key={field.key} value={field.key}>
                  {field.name}
                </option>
              ))}
          </select>
          <select
            aria-label={'过滤方式 ' + (i + 1)}
            value={f.operator}
            onChange={(e) => update(i, { operator: e.target.value as DraftFilter['operator'] })}
          >
            {[
              ['eq', '等于'],
              ['ne', '不等于'],
              ['gt', '大于'],
              ['gte', '大于等于'],
              ['lt', '小于'],
              ['lte', '小于等于'],
              ['in', '属于'],
              ['between', '区间'],
            ].map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            aria-label={'过滤值 ' + (i + 1)}
            value={f.value}
            placeholder={['in', 'between'].includes(f.operator) ? '以英文逗号分隔' : '输入过滤值'}
            onChange={(e) => update(i, { value: e.target.value })}
          />
          <IconButton
            type="button"
            label="删除过滤条件"
            icon="x"
            onClick={() => onChange(filters.filter((_, n) => n !== i))}
          />
        </div>
      ))}
      <Button
        type="button"
        variant="quiet"
        icon="plus"
        onClick={() =>
          onChange([
            ...filters,
            { fieldKey: fields.find((f) => f.filterable)?.key ?? '', operator: 'eq', value: '' },
          ])
        }
      >
        添加过滤条件
      </Button>
    </div>
  );
}
export function VersionEditor({
  api,
  dataset,
  datasets,
  previous,
  onClose,
  onSaved,
}: {
  api: Api;
  dataset: S['Dataset'];
  datasets: S['Dataset'][];
  previous: S['DatasetVersion'] | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [tab, setTab] = useState<'fields' | 'metrics' | 'relationships'>('fields'),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [snapshots, setSnapshots] = useState<S['MetadataSnapshot'][]>([]),
    [snapshotId, setSnapshotId] = useState(''),
    [relationKey, setRelationKey] = useState(''),
    [fields, setFields] = useState<DraftField[]>([]),
    [metrics, setMetrics] = useState<DraftMetric[]>([]),
    [relationships, setRelationships] = useState<S['DatasetRelationship'][]>([]),
    [targets, setTargets] = useState<{ dataset: S['Dataset']; version: S['DatasetVersion'] }[]>([]);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const mappings = await api.list<S['SourceMapping']>(
          '/logical-data-sources/' + dataset.logicalDataSourceId + '/mappings',
        );
        const mapping = mappings.find((m) => m.environment === 'test');
        if (!mapping) throw new Error('此数据源尚未配置 TEST 映射，请先完成连接检查与元数据同步。');
        const result = await api.list<S['MetadataSnapshot']>(
          '/physical-connections/' + mapping.physicalConnectionId + '/metadata',
        );
        if (!result.length) throw new Error('此测试连接尚无成功的元数据同步结果。');
        const chosen = result.find((s) => s.id === previous?.metadataSnapshotId) ?? result[0];
        if (!chosen) throw new Error('暂无可用结构。');
        const rel =
          chosen.relations.find(
            (r) => r.schema === previous?.relation.schema && r.name === previous.relation.name,
          ) ?? chosen.relations[0];
        if (!rel) throw new Error('所选同步结果不包含表或视图。');
        const versions = await Promise.all(
          datasets
            .filter(
              (d) => d.id !== dataset.id && d.logicalDataSourceId === dataset.logicalDataSourceId,
            )
            .map(async (d) => ({
              dataset: d,
              versions: await api.list<S['DatasetVersion']>('/datasets/' + d.id + '/versions'),
            })),
        );
        if (!active) return;
        setSnapshots(result);
        setSnapshotId(chosen.id);
        setRelationKey(rel.schema + '.' + rel.name);
        setFields(
          previous ? previous.fields.map((f) => ({ ...f, selected: true })) : fieldsFor(rel),
        );
        setMetrics(
          previous
            ? previous.metrics.map((m) => ({ ...m, filters: m.filters.map(draftFilter) }))
            : [],
        );
        setRelationships(previous?.relationships ?? []);
        setTargets(
          versions.flatMap((v) => v.versions.map((version) => ({ dataset: v.dataset, version }))),
        );
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : '读取结构失败。');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [api, dataset.id]);
  const snapshot = snapshots.find((s) => s.id === snapshotId),
    relation = snapshot?.relations.find((r) => r.schema + '.' + r.name === relationKey),
    selected = fields.filter((f) => f.selected),
    dimensions = selected.filter((f) => f.isDimension);
  function choose(snapshot: S['MetadataSnapshot'] | undefined, key?: string) {
    const r =
      snapshot?.relations.find((r) => r.schema + '.' + r.name === key) ?? snapshot?.relations[0];
    if (!snapshot || !r) return;
    setSnapshotId(snapshot.id);
    setRelationKey(r.schema + '.' + r.name);
    setFields(fieldsFor(r));
    setMetrics([]);
    setRelationships([]);
  }
  const changeField = (index: number, value: Partial<DraftField>) =>
    setFields(fields.map((f, i) => (i === index ? { ...f, ...value } : f)));
  const changeMetric = (index: number, value: Partial<DraftMetric>) =>
    setMetrics(metrics.map((m, i) => (i === index ? { ...m, ...value } : m)));
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (!snapshot || !relation || !selected.length) throw new Error('请至少选择一个业务字段。');
      const wireFields = selected.map(({ selected: _selected, ...f }) => f);
      for (const f of wireFields)
        if (!f.name.trim() || !f.key.match(/^[a-z][a-z0-9_]{1,62}$/))
          throw new Error('请填写字段名称，并使用有效的业务字段编码。');
      const wireMetrics = metrics.map((m) => ({
        ...m,
        filters: m.filters.map((f) => parseFilter(f, wireFields)),
      }));
      for (const m of wireMetrics)
        if (
          !m.name.trim() ||
          !m.businessDefinition.trim() ||
          !m.key.match(/^[a-z][a-z0-9_]{1,62}$/) ||
          !wireFields.some((f) => f.key === m.fieldKey)
        )
          throw new Error('每个指标需要名称、有效编码、聚合字段和明确的计算口径。');
      for (const r of relationships)
        if (
          !r.targetDatasetVersionId ||
          !r.sourceFieldKey ||
          !r.targetFieldKey ||
          !r.key.match(/^[a-z][a-z0-9_]{1,62}$/)
        )
          throw new Error('请完整填写关联关系的名称编码、目标版本与两侧字段。');
      await api.request('/datasets/' + dataset.id + '/versions', {
        method: 'POST',
        body: {
          metadataSnapshotId: snapshot.id,
          relation: { schema: relation.schema, name: relation.name },
          fields: wireFields,
          metrics: wireMetrics,
          relationships,
        } satisfies S['CreateDatasetVersion'],
      });
      await onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存版本失败。');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title={previous ? '创建新语义版本' : '定义数据集语义'}
      subtitle={
        dataset.name + ' · ' + (previous ? '基于版本 ' + previous.version : '首次定义字段与指标')
      }
      wide
      onClose={onClose}
    >
      <form onSubmit={(e) => void submit(e)}>
        <div className="editor-tabs">
          {[
            ['fields', '来源与字段', selected.length],
            ['metrics', '业务指标', metrics.length],
            ['relationships', '关联关系', relationships.length],
          ].map(([key, label, count]) => (
            <button
              type="button"
              className={tab === key ? 'active' : ''}
              key={key}
              onClick={() => setTab(key as typeof tab)}
            >
              {label}
              <span>{count}</span>
            </button>
          ))}
        </div>
        <div className="dialog-body editor-body">
          {error && <ErrorBanner error={error} />}{' '}
          {loading ? (
            <Loading />
          ) : !snapshots.length ? (
            <Empty
              icon="table"
              title="尚无可用测试结构"
              description="完成 TEST 环境映射与元数据同步后，可定义业务字段和指标。"
            />
          ) : (
            <>
              {tab === 'fields' && (
                <>
                  <div className="form-grid editor-source">
                    <Field label="元数据版本">
                      <select
                        value={snapshotId}
                        onChange={(e) => choose(snapshots.find((s) => s.id === e.target.value))}
                      >
                        {snapshots.map((s) => (
                          <option value={s.id} key={s.id}>
                            {new Date(s.createdAt).toLocaleString('zh-CN')} · {s.relations.length}{' '}
                            个对象
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="来源表 / 视图">
                      <select
                        value={relationKey}
                        onChange={(e) => choose(snapshot, e.target.value)}
                      >
                        {snapshot?.relations.map((r) => (
                          <option key={r.schema + '.' + r.name} value={r.schema + '.' + r.name}>
                            {r.schema}.{r.name} · {r.kind === 'view' ? '视图' : '表'}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <div className="section-heading">
                    <h3>
                      业务字段{' '}
                      <span>
                        {selected.length} / {fields.length}
                      </span>
                    </h3>
                    <Button
                      type="button"
                      variant="quiet"
                      onClick={() => setFields(fields.map((f) => ({ ...f, selected: true })))}
                    >
                      选择全部
                    </Button>
                  </div>
                  <div className="table-scroll">
                    <table className="editor-table">
                      <thead>
                        <tr>
                          <th className="check-cell" />
                          <th>来源字段</th>
                          <th>业务编码</th>
                          <th>业务名称</th>
                          <th>类型</th>
                          <th>维度</th>
                          <th>可过滤</th>
                          <th>敏感级别</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fields.map((f, i) => (
                          <tr key={f.physicalColumn} className={!f.selected ? 'deselected' : ''}>
                            <td>
                              <input
                                aria-label={'包含字段 ' + f.physicalColumn}
                                type="checkbox"
                                checked={f.selected}
                                onChange={(e) => changeField(i, { selected: e.target.checked })}
                              />
                            </td>
                            <td>
                              <code>{f.physicalColumn}</code>
                              {relation?.columns.find((c) => c.name === f.physicalColumn)
                                ?.primaryKey && <span className="tiny-label">PK</span>}
                            </td>
                            <td>
                              <input
                                aria-label={f.physicalColumn + ' 业务编码'}
                                value={f.key}
                                onChange={(e) => changeField(i, { key: e.target.value })}
                              />
                            </td>
                            <td>
                              <input
                                aria-label={f.physicalColumn + ' 业务名称'}
                                value={f.name}
                                onChange={(e) => changeField(i, { name: e.target.value })}
                              />
                              <input
                                className="field-description-input"
                                aria-label={f.physicalColumn + ' 字段说明'}
                                placeholder="补充字段业务说明"
                                maxLength={2000}
                                value={f.description}
                                onChange={(e) => changeField(i, { description: e.target.value })}
                              />
                            </td>
                            <td>
                              <span className="type-tag">{f.dataType}</span>
                            </td>
                            <td>
                              <input
                                aria-label={f.physicalColumn + ' 作为维度'}
                                type="checkbox"
                                checked={f.isDimension}
                                onChange={(e) => changeField(i, { isDimension: e.target.checked })}
                              />
                            </td>
                            <td>
                              <input
                                aria-label={f.physicalColumn + ' 可过滤'}
                                type="checkbox"
                                checked={f.filterable}
                                onChange={(e) => changeField(i, { filterable: e.target.checked })}
                              />
                            </td>
                            <td>
                              <select
                                aria-label={f.physicalColumn + ' 敏感级别'}
                                value={f.classification}
                                onChange={(e) =>
                                  changeField(i, {
                                    classification: e.target.value as typeof f.classification,
                                  })
                                }
                              >
                                <option value="public">公开</option>
                                <option value="internal">内部</option>
                                <option value="sensitive">敏感</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="helper">
                    仅勾选的字段会进入业务数据集。编码用于稳定引用，业务名称与说明用于解释字段含义。
                  </p>
                </>
              )}
              {tab === 'metrics' && (
                <>
                  <div className="section-heading">
                    <div>
                      <h3>定义可复用的业务指标</h3>
                      <p>让每一次汇总都有一致、可解释的计算口径。</p>
                    </div>
                    <Button
                      type="button"
                      icon="plus"
                      onClick={() =>
                        setMetrics([
                          ...metrics,
                          {
                            key: '',
                            name: '',
                            aggregate: 'sum',
                            fieldKey:
                              selected.find((f) => ['number', 'integer'].includes(f.dataType))
                                ?.key ??
                              selected[0]?.key ??
                              '',
                            businessDefinition: '',
                            description: '',
                            filters: [],
                            availableDimensions: dimensions.map((f) => f.key),
                          },
                        ])
                      }
                    >
                      添加指标
                    </Button>
                  </div>
                  {!metrics.length && (
                    <Empty
                      icon="chart"
                      title="尚未定义指标"
                      description="添加聚合方式、计算口径与过滤规则，形成可复用的业务语义。"
                    />
                  )}
                  {metrics.map((m, i) => (
                    <section className="metric-editor" key={i}>
                      <div className="metric-editor-header">
                        <span className="step-number">{String(i + 1).padStart(2, '0')}</span>
                        <h3>{m.name || '业务指标'}</h3>
                        <IconButton
                          type="button"
                          icon="trash"
                          label="删除指标"
                          onClick={() => setMetrics(metrics.filter((_, n) => n !== i))}
                        />
                      </div>
                      <div className="form-grid">
                        <Field label="指标名称">
                          <input
                            value={m.name}
                            maxLength={120}
                            onChange={(e) => changeMetric(i, { name: e.target.value })}
                          />
                        </Field>
                        <Field label="指标编码">
                          <input
                            className="mono"
                            value={m.key}
                            onChange={(e) => changeMetric(i, { key: e.target.value })}
                          />
                        </Field>
                        <Field label="聚合方式">
                          <select
                            value={m.aggregate}
                            onChange={(e) =>
                              changeMetric(i, { aggregate: e.target.value as typeof m.aggregate })
                            }
                          >
                            {[
                              ['sum', '求和 SUM'],
                              ['avg', '平均值 AVG'],
                              ['count', '非空计数 COUNT'],
                              ['countDistinct', '去重计数'],
                              ['min', '最小值 MIN'],
                              ['max', '最大值 MAX'],
                            ].map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="计算字段">
                          <select
                            value={m.fieldKey}
                            onChange={(e) => changeMetric(i, { fieldKey: e.target.value })}
                          >
                            <option value="">选择字段</option>
                            {selected.map((f) => (
                              <option key={f.key} value={f.key}>
                                {f.name} · {f.key}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="计算口径" wide>
                          <textarea
                            rows={2}
                            maxLength={2000}
                            value={m.businessDefinition}
                            onChange={(e) =>
                              changeMetric(i, { businessDefinition: e.target.value })
                            }
                          />
                        </Field>
                        <Field label="业务描述" wide>
                          <input
                            maxLength={2000}
                            value={m.description}
                            onChange={(e) => changeMetric(i, { description: e.target.value })}
                          />
                        </Field>
                        <div className="field span-2">
                          <span>可用维度</span>
                          <div className="dimension-options">
                            {dimensions.map((f) => (
                              <label key={f.key}>
                                <input
                                  type="checkbox"
                                  checked={m.availableDimensions.includes(f.key)}
                                  onChange={(e) =>
                                    changeMetric(i, {
                                      availableDimensions: e.target.checked
                                        ? [...m.availableDimensions, f.key]
                                        : m.availableDimensions.filter((k) => k !== f.key),
                                    })
                                  }
                                />
                                {f.name}
                              </label>
                            ))}
                            {!dimensions.length && <small>在字段页选择允许分组的维度。</small>}
                          </div>
                        </div>
                        <div className="field span-2">
                          <span>指标过滤规则</span>
                          <FilterEditor
                            fields={selected}
                            filters={m.filters}
                            onChange={(filters) => changeMetric(i, { filters })}
                          />
                        </div>
                      </div>
                    </section>
                  ))}
                </>
              )}
              {tab === 'relationships' && (
                <>
                  <div className="section-heading">
                    <div>
                      <h3>业务关联关系</h3>
                      <p>记录同一业务数据源内的数据集关系。测试预览保持单表或单视图读取。</p>
                    </div>
                    <Button
                      type="button"
                      icon="plus"
                      disabled={!targets.length}
                      onClick={() =>
                        setRelationships([
                          ...relationships,
                          {
                            key: '',
                            targetDatasetVersionId: '',
                            sourceFieldKey: '',
                            targetFieldKey: '',
                            cardinality: 'many-to-one',
                            description: '',
                          },
                        ])
                      }
                    >
                      添加关联
                    </Button>
                  </div>
                  {!relationships.length && (
                    <Empty
                      icon="link"
                      title={targets.length ? '尚未定义关联' : '暂无可关联的数据集版本'}
                      description="关联目标需已有语义版本，并归属于同一逻辑数据源。"
                    />
                  )}
                  {relationships.map((r, i) => {
                    const target = targets.find((t) => t.version.id === r.targetDatasetVersionId);
                    const update = (value: Partial<typeof r>) =>
                      setRelationships(
                        relationships.map((current, n) =>
                          n === i ? { ...current, ...value } : current,
                        ),
                      );
                    return (
                      <section className="metric-editor" key={i}>
                        <div className="metric-editor-header">
                          <Icon name="link" />
                          <h3>关联 {i + 1}</h3>
                          <IconButton
                            type="button"
                            icon="trash"
                            label="删除关联"
                            onClick={() =>
                              setRelationships(relationships.filter((_, n) => n !== i))
                            }
                          />
                        </div>
                        <div className="form-grid">
                          <Field label="关联编码">
                            <input
                              value={r.key}
                              onChange={(e) => update({ key: e.target.value })}
                            />
                          </Field>
                          <Field label="关系类型">
                            <select
                              value={r.cardinality}
                              onChange={(e) =>
                                update({ cardinality: e.target.value as typeof r.cardinality })
                              }
                            >
                              <option value="many-to-one">多对一</option>
                              <option value="one-to-many">一对多</option>
                              <option value="one-to-one">一对一</option>
                            </select>
                          </Field>
                          <Field label="当前数据集字段">
                            <select
                              value={r.sourceFieldKey}
                              onChange={(e) => update({ sourceFieldKey: e.target.value })}
                            >
                              <option value="">选择字段</option>
                              {selected.map((f) => (
                                <option key={f.key} value={f.key}>
                                  {f.name}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label="目标数据集版本">
                            <select
                              value={r.targetDatasetVersionId}
                              onChange={(e) =>
                                update({
                                  targetDatasetVersionId: e.target.value,
                                  targetFieldKey: '',
                                })
                              }
                            >
                              <option value="">选择目标版本</option>
                              {targets.map((t) => (
                                <option key={t.version.id} value={t.version.id}>
                                  {t.dataset.name} · V{t.version.version}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label="目标字段">
                            <select
                              value={r.targetFieldKey}
                              onChange={(e) => update({ targetFieldKey: e.target.value })}
                            >
                              <option value="">选择字段</option>
                              {target?.version.fields.map((f) => (
                                <option key={f.key} value={f.key}>
                                  {f.name} · {f.key}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label="业务说明">
                            <input
                              value={r.description}
                              onChange={(e) => update({ description: e.target.value })}
                            />
                          </Field>
                        </div>
                      </section>
                    );
                  })}
                </>
              )}
            </>
          )}
        </div>
        <footer className="dialog-footer">
          <span className="footer-note">
            <Icon name="lock" size={14} />
            版本封存后，更改会形成新版本。
          </span>
          <Button type="button" onClick={onClose} disabled={busy}>
            取消
          </Button>
          <Button variant="primary" type="submit" disabled={busy || loading || !snapshots.length}>
            {busy ? '正在创建…' : '创建语义版本'}
          </Button>
        </footer>
      </form>
    </Dialog>
  );
}
export { parseFilter, draftFilter };
