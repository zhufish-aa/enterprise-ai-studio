import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Api, type S, failureMessage } from './api.js';
import {
  Button,
  Dialog,
  Empty,
  ErrorBanner,
  Loading,
  Environment,
  formatDate,
  IconButton,
} from './components.js';
import { Icon } from './icons.js';
import { FilterEditor, parseFilter, draftFilter } from './version-editor.js';
import { GrantDialog } from './forms.js';
export function MetadataBrowser({
  api,
  connection,
  revision,
  onSync,
  canSync,
}: {
  api: Api;
  connection: S['PhysicalConnection'] | null;
  revision: number;
  onSync: (c: S['PhysicalConnection']) => void;
  canSync: boolean;
}) {
  const [snapshots, setSnapshots] = useState<S['MetadataSnapshot'][]>([]),
    [snapshotId, setSnapshotId] = useState(''),
    [relationKey, setRelationKey] = useState(''),
    [loading, setLoading] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    if (!connection) {
      setSnapshots([]);
      return;
    }
    const abort = new AbortController();
    setLoading(true);
    setError('');
    void api
      .list<S['MetadataSnapshot']>(
        '/physical-connections/' + connection.id + '/metadata',
        abort.signal,
      )
      .then((items) => {
        setSnapshots(items);
        setSnapshotId(items[0]?.id ?? '');
        setRelationKey(
          items[0]?.relations[0]
            ? [items[0].relations[0].schema, items[0].relations[0].name].join('.')
            : '',
        );
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [api, connection?.id, revision]);
  const snapshot = snapshots.find((s) => s.id === snapshotId),
    relation = snapshot?.relations.find((r) => r.schema + '.' + r.name === relationKey);
  if (!connection)
    return (
      <Empty
        icon="table"
        title="尚未配置环境连接"
        description="完成连接健康检查和同步后，可浏览此环境的结构。"
      />
    );
  return (
    <div className="metadata-browser">
      <div className="section-heading">
        <div>
          <h3>数据库结构</h3>
          <p>{connection.metadataScope.length} 个批准对象</p>
        </div>
        {canSync && (
          <Button variant="quiet" icon="refresh" onClick={() => onSync(connection)}>
            同步
          </Button>
        )}
      </div>
      {error && <ErrorBanner error={error} />}{' '}
      {loading ? (
        <Loading />
      ) : !snapshot ? (
        <Empty
          icon="table"
          title="暂无同步结果"
          description="明确选择本次要同步的表与视图，建立元数据快照。"
          action={
            canSync ? (
              <Button onClick={() => onSync(connection)} icon="refresh">
                同步元数据
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <select
            className="snapshot-select"
            aria-label="元数据快照"
            value={snapshotId}
            onChange={(e) => {
              const s = snapshots.find((s) => s.id === e.target.value);
              setSnapshotId(e.target.value);
              setRelationKey(
                s?.relations[0] ? [s.relations[0].schema, s.relations[0].name].join('.') : '',
              );
            }}
          >
            {snapshots.map((s) => (
              <option key={s.id} value={s.id}>
                {formatDate(s.createdAt)} · {s.relations.length} 个对象
              </option>
            ))}
          </select>
          <div className="metadata-tree">
            {[...new Set(snapshot.relations.map((r) => r.schema))].map((schema) => (
              <details open key={schema}>
                <summary>
                  <Icon name="database" size={16} />
                  <span>{schema}</span>
                  <span className="tree-count">
                    {snapshot.relations.filter((r) => r.schema === schema).length}
                  </span>
                </summary>
                {snapshot.relations
                  .filter((r) => r.schema === schema)
                  .map((r) => (
                    <button
                      key={r.schema + '.' + r.name}
                      className={
                        'tree-relation ' +
                        (relationKey === r.schema + '.' + r.name ? 'selected' : '')
                      }
                      onClick={() => setRelationKey(r.schema + '.' + r.name)}
                    >
                      <Icon name={r.kind === 'view' ? 'columns' : 'table'} size={15} />
                      <span>{r.name}</span>
                      <small>{r.kind === 'view' ? '视图' : '表'}</small>
                    </button>
                  ))}
              </details>
            ))}
          </div>
          {relation && (
            <div className="relation-detail">
              <div className="section-heading">
                <h3>{relation.comment || relation.name}</h3>
                <span className="muted">{relation.columns.length} 字段</span>
              </div>
              <div className="metadata-columns">
                <table>
                  <thead>
                    <tr>
                      <th>字段</th>
                      <th>类型</th>
                      <th>可空</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relation.columns.map((c) => (
                      <tr key={c.name}>
                        <td>
                          <span className="mono">{c.name}</span>
                          {c.primaryKey && <span className="tiny-label">PK</span>}
                          {c.comment && <small>{c.comment}</small>}
                        </td>
                        <td>
                          <code>{c.dbType}</code>
                        </td>
                        <td>{c.nullable ? '是' : '否'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {relation.indexes.length > 0 && (
                <details className="metadata-extra">
                  <summary>
                    索引 <span>{relation.indexes.length}</span>
                  </summary>
                  {relation.indexes.map((i) => (
                    <div className="index-line" key={i.name}>
                      <code>{i.name}</code>
                      <small>
                        {i.columns.join(', ')}
                        {i.primary ? ' · 主键' : i.unique ? ' · 唯一' : ''}
                      </small>
                    </div>
                  ))}
                </details>
              )}
              {relation.foreignKeys.length > 0 && (
                <details className="metadata-extra">
                  <summary>
                    外键 <span>{relation.foreignKeys.length}</span>
                  </summary>
                  {relation.foreignKeys.map((f) => (
                    <div className="index-line" key={f.name}>
                      <code>{f.columns.join(', ')}</code>
                      <small>
                        → {f.referencedSchema}.{f.referencedRelation} (
                        {f.referencedColumns.join(', ')})
                      </small>
                    </div>
                  ))}
                </details>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
export function PreviewDialog({
  api,
  dataset,
  versions,
  onClose,
}: {
  api: Api;
  dataset: S['Dataset'];
  versions: S['DatasetVersion'][];
  onClose: () => void;
}) {
  const [versionId, setVersionId] = useState(versions[0]?.id ?? ''),
    [dimensions, setDimensions] = useState<string[]>([]),
    [metrics, setMetrics] = useState<string[]>([]),
    [filters, setFilters] = useState<ReturnType<typeof draftFilter>[]>([]),
    [limit, setLimit] = useState(20),
    [result, setResult] = useState<S['QueryResult'] | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const pendingJob = useRef<string | null>(null);
  const version = versions.find((v) => v.id === versionId);
  const activeRequest = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    activeRequest.current = controller;
    return () => {
      controller.abort();
      activeRequest.current = null;
      const id = pendingJob.current;
      if (id) void api.request('/query-jobs/' + id + '/cancel', { method: 'POST' }).catch(() => {});
    };
  }, [api]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const abort = activeRequest.current;
    if (!version || !abort || abort.signal.aborted) return;
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const initial = await api.request<S['QueryJob']>('/queries/test', {
        method: 'POST',
        body: {
          query: {
            datasetId: dataset.id,
            datasetVersionId: version.id,
            dimensions: dimensions.length
              ? dimensions
              : metrics.length
                ? []
                : version.fields.map((f) => f.key),
            metrics,
            groupBy: metrics.length ? dimensions : [],
            orderBy: [],
            filters: filters.map((f) => parseFilter(f, version.fields)),
            limit,
          },
        },
        signal: abort.signal,
      });
      let job = initial;
      pendingJob.current = job.id;
      for (let n = 0; n < 240 && !['succeeded', 'failed', 'cancelled'].includes(job.status); n++) {
        await new Promise((r) => setTimeout(r, 500));
        job = await api.request<S['QueryJob']>('/query-jobs/' + job.id, { signal: abort.signal });
      }
      if (job.status !== 'succeeded' || !job.result || !('rows' in job.result))
        throw new Error(failureMessage(job.failureCode));
      setResult(job.result);
    } catch (e) {
      if (!abort.signal.aborted) setError(e instanceof Error ? e.message : '预览失败。');
    } finally {
      pendingJob.current = null;
      if (!abort.signal.aborted) setBusy(false);
    }
  }
  return (
    <Dialog
      title={dataset.name + ' · 数据预览'}
      subtitle="通过安全查询网关读取测试数据，应用当前部门、字段与脱敏策略。"
      wide
      onClose={onClose}
    >
      <form onSubmit={(e) => void submit(e)}>
        <div className="dialog-body">
          <div className="preview-bar">
            <Environment value="test" />
            <select
              aria-label="数据集版本"
              value={versionId}
              onChange={(e) => {
                setVersionId(e.target.value);
                setDimensions([]);
                setMetrics([]);
                setFilters([]);
                setResult(null);
              }}
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  语义版本 V{v.version}
                </option>
              ))}
            </select>
            <label>
              返回上限
              <input
                aria-label="返回上限"
                type="number"
                min={1}
                max={100}
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
              />
            </label>
            <Button variant="primary" icon="arrow" type="submit" disabled={busy || !version}>
              {busy ? '正在查询…' : '运行测试预览'}
            </Button>
          </div>
          {error && <ErrorBanner error={error} />}{' '}
          {version && (
            <div className="preview-options">
              <div>
                <h3>分组维度</h3>
                <div className="dimension-options">
                  {version.fields
                    .filter((f) => f.isDimension)
                    .map((f) => (
                      <label key={f.key}>
                        <input
                          type="checkbox"
                          checked={dimensions.includes(f.key)}
                          onChange={(e) =>
                            setDimensions(
                              e.target.checked
                                ? [...dimensions, f.key]
                                : dimensions.filter((k) => k !== f.key),
                            )
                          }
                        />
                        {f.name}
                      </label>
                    ))}
                  {!version.fields.some((f) => f.isDimension) && (
                    <span className="muted">暂无可用维度</span>
                  )}
                </div>
              </div>
              <div>
                <h3>业务指标</h3>
                <div className="dimension-options">
                  {version.metrics.map((m) => (
                    <label key={m.key} title={m.businessDefinition}>
                      <input
                        type="checkbox"
                        checked={metrics.includes(m.key)}
                        onChange={(e) =>
                          setMetrics(
                            e.target.checked
                              ? [...metrics, m.key]
                              : metrics.filter((k) => k !== m.key),
                          )
                        }
                      />
                      {m.name}
                    </label>
                  ))}
                  {!version.metrics.length && <span className="muted">此版本可预览明细记录</span>}
                </div>
              </div>
              <div className="span-2">
                <h3>过滤条件</h3>
                <FilterEditor fields={version.fields} filters={filters} onChange={setFilters} />
              </div>
            </div>
          )}
          {busy ? (
            <Loading />
          ) : result ? (
            <>
              <div className="section-heading result-heading">
                <h3>查询结果</h3>
                <span className="muted">
                  {result.rows.length} 行{result.truncated ? ' · 已达到返回上限' : ''}
                </span>
              </div>
              <div className="table-scroll preview-results">
                <table>
                  <thead>
                    <tr>
                      {result.columns.map((c) => (
                        <th key={c.key}>
                          {version?.fields.find((f) => f.key === c.key)?.name ??
                            version?.metrics.find((m) => m.key === c.key)?.name ??
                            c.key}
                          <small>
                            {c.key}
                            {c.masked ? ' · 已脱敏' : ''}
                          </small>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row, i) => (
                      <tr key={i}>
                        {row.map((v, j) => (
                          <td key={j}>
                            {v === null ? <span className="null-value">NULL</span> : String(v)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!result.rows.length && <p className="no-results">没有匹配当前条件的记录。</p>}
              </div>
            </>
          ) : (
            <div className="preview-idle">
              <Icon name="table" size={25} />
              <p>选择维度、指标或过滤条件，运行测试预览。</p>
            </div>
          )}
        </div>
        <footer className="dialog-footer">
          <Button type="button" onClick={onClose}>
            关闭预览
          </Button>
        </footer>
      </form>
    </Dialog>
  );
}
export function PermissionsPage({
  api,
  datasets,
  sources,
  members,
  onChanged,
  onError,
}: {
  api: Api;
  datasets: S['Dataset'][];
  sources: S['LogicalDataSource'][];
  members: S['OrganizationMember'][];
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [type, setType] = useState<'dataset' | 'source'>('dataset'),
    [resourceId, setResourceId] = useState(''),
    [grants, setGrants] = useState<S['DatasetGrant'][]>([]),
    [version, setVersion] = useState<S['DatasetVersion'] | null>(null),
    [loading, setLoading] = useState(false),
    [dialog, setDialog] = useState(false),
    [revision, setRevision] = useState(0),
    [error, setError] = useState('');
  const resources = type === 'dataset' ? datasets : sources;
  const selected = resources.find((r) => r.id === resourceId) ?? resources[0];
  useEffect(() => {
    if (!selected) {
      setGrants([]);
      return;
    }
    const abort = new AbortController();
    setLoading(true);
    setError('');
    void Promise.all([
      api.list<S['DatasetGrant']>(
        (type === 'dataset' ? '/datasets/' : '/logical-data-sources/') + selected.id + '/grants',
        abort.signal,
      ),
      type === 'dataset'
        ? api.list<S['DatasetVersion']>('/datasets/' + selected.id + '/versions', abort.signal)
        : Promise.resolve([]),
    ])
      .then(([grants, versions]) => {
        setGrants(grants);
        setVersion(versions[0] ?? null);
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [api, type, selected?.id, revision]);
  async function revoke(id: string) {
    try {
      await api.request('/resource-grants/' + id, { method: 'DELETE' });
      setRevision((v) => v + 1);
      await onChanged();
    } catch (e) {
      onError(e instanceof Error ? e.message : '撤销失败。');
    }
  }
  const memberName = (id: string) =>
    members.find((m) => m.userId === id)?.displayName ?? id.slice(0, 8);
  return (
    <div className="permissions-workspace">
      <aside className="resource-list">
        <div className="segmented">
          <button
            className={type === 'dataset' ? 'active' : ''}
            onClick={() => {
              setType('dataset');
              setResourceId('');
            }}
          >
            数据集
          </button>
          <button
            className={type === 'source' ? 'active' : ''}
            onClick={() => {
              setType('source');
              setResourceId('');
            }}
          >
            数据源
          </button>
        </div>
        <p className="list-caption">选择要管理的资源</p>
        {resources.map((r) => (
          <button
            className={'resource-item ' + (r.id === selected?.id ? 'active' : '')}
            key={r.id}
            onClick={() => setResourceId(r.id)}
          >
            <Icon name={type === 'dataset' ? 'table' : 'database'} size={17} />
            <span>
              {r.name}
              <small>{r.key}</small>
            </span>
            <Icon name="chevron" size={14} />
          </button>
        ))}
        {!resources.length && <p className="helper">暂无可管理的资源。</p>}
      </aside>
      <section className="permission-detail">
        {!selected ? (
          <Empty
            icon="shield"
            title="暂无可授权的资源"
            description="创建数据源和数据集后，即可为成员配置访问范围。"
          />
        ) : (
          <>
            <div className="permission-heading">
              <div>
                <div className="eyebrow">RESOURCE ACCESS</div>
                <h2>{selected.name}</h2>
                <p>按资源、动作与有效期管理成员访问。</p>
              </div>
              <Button
                variant="primary"
                icon="plus"
                onClick={() => setDialog(true)}
                disabled={type === 'dataset' && !version}
              >
                授予权限
              </Button>
            </div>
            {error && <ErrorBanner error={error} />}{' '}
            {loading ? (
              <Loading />
            ) : !grants.length ? (
              <Empty
                icon="shield"
                title="尚未授予访问权限"
                description="只有获得相应授权的成员才能浏览结构或预览测试数据。"
              />
            ) : (
              <div className="table-scroll">
                <table className="permissions-table">
                  <thead>
                    <tr>
                      <th>成员</th>
                      <th>允许动作</th>
                      <th>字段与指标</th>
                      <th>有效期</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {grants.map((g) => (
                      <tr key={g.id}>
                        <td>
                          <div className="person-cell">
                            <span className="avatar small">
                              {memberName(g.principalUserId).slice(-2)}
                            </span>
                            <strong>{memberName(g.principalUserId)}</strong>
                          </div>
                        </td>
                        <td>
                          {g.action === 'dataset.read'
                            ? '结构浏览'
                            : g.action === 'dataset.query.test'
                              ? '测试预览'
                              : '数据源浏览'}
                        </td>
                        <td>
                          {type === 'source' ? (
                            <span className="muted">逻辑目录</span>
                          ) : (
                            <span>
                              {g.fieldKeys.length} 字段 · {g.metricKeys.length} 指标
                            </span>
                          )}
                        </td>
                        <td className="mono">
                          {new Date(g.expiresAt).toLocaleDateString('zh-CN')}
                        </td>
                        <td>
                          <Button variant="quiet" onClick={() => void revoke(g.id)}>
                            撤销
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="permission-note">
              <Icon name="lock" size={17} />
              <p>
                数据集浏览与测试预览是两项独立授权。授权变更后，后续请求与结果读取会重新校验权限。
              </p>
            </div>
          </>
        )}
      </section>
      {dialog && selected && (
        <GrantDialog
          api={api}
          resourceId={selected.id}
          type={type}
          members={members}
          version={version}
          onClose={() => setDialog(false)}
          onSaved={async () => {
            setRevision((v) => v + 1);
            await onChanged();
          }}
        />
      )}
    </div>
  );
}
