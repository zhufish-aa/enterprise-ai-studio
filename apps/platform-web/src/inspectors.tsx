import { useEffect, useState } from 'react';
import { Api, type S } from './api.js';
import {
  Button,
  Empty,
  Environment,
  Status,
  Loading,
  ErrorBanner,
  formatDate,
} from './components.js';
import { Icon } from './icons.js';
import { engineName, sensitivityName } from './forms.js';
import { MetadataBrowser } from './data-views.js';
type InspectorActions = {
  onEdit: () => void;
  onCreateConnection: (environment: 'test' | 'production') => void;
  onCheck: (connection: S['PhysicalConnection']) => void;
  onSync: (connection: S['PhysicalConnection']) => void;
  onRefresh: () => Promise<void>;
  onError: (message: string) => void;
};
export function SourceInspector({
  api,
  source,
  datasets,
  connections,
  me,
  revision,
  busyConnections,
  ...actions
}: {
  api: Api;
  source: S['LogicalDataSource'];
  datasets: S['Dataset'][];
  connections: S['PhysicalConnection'][];
  me: S['CurrentUser'];
  revision: number;
  busyConnections: Set<string>;
} & InspectorActions) {
  const [tab, setTab] = useState<'overview' | 'mappings' | 'metadata'>('overview'),
    [environment, setEnvironment] = useState<'test' | 'production'>('test'),
    [mappings, setMappings] = useState<S['SourceMapping'][]>([]),
    [chosen, setChosen] = useState<Record<string, string>>({}),
    [loading, setLoading] = useState(false),
    [saving, setSaving] = useState(''),
    [error, setError] = useState('');
  const admin = me.permissions.includes('catalog.manage'),
    manage = me.clientKind === 'human' && me.permissions.includes('mapping.manage');
  useEffect(() => {
    if (!manage) return;
    const abort = new AbortController();
    setLoading(true);
    setError('');
    void api
      .list<S['SourceMapping']>('/logical-data-sources/' + source.id + '/mappings', abort.signal)
      .then((rows) => {
        setMappings(rows);
        setChosen(Object.fromEntries(rows.map((m) => [m.environment, m.physicalConnectionId])));
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [api, source.id, revision, manage]);
  const connectionFor = (env: 'test' | 'production') =>
    connections.find(
      (c) => c.id === mappings.find((m) => m.environment === env)?.physicalConnectionId,
    ) ?? null;
  async function bind(env: 'test' | 'production') {
    setSaving(env);
    setError('');
    try {
      await api.request('/logical-data-sources/' + source.id + '/mappings?environment=' + env, {
        method: 'PUT',
        revision: source.revision,
        body: { physicalConnectionId: chosen[env] },
      });
      await actions.onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '配置映射失败。');
    } finally {
      setSaving('');
    }
  }
  return (
    <aside className="inspector">
      <div className="inspector-title">
        <div className="entity-icon">
          <Icon name="chart" size={22} />
        </div>
        <div>
          <h2>{source.name}</h2>
          <code>{source.key}</code>
        </div>
        {admin && (
          <button
            className="icon-button"
            aria-label="编辑数据源"
            title="编辑数据源"
            onClick={actions.onEdit}
          >
            <Icon name="edit" size={17} />
          </button>
        )}
      </div>
      <p className="inspector-description">{source.description || '此数据源尚未填写业务说明。'}</p>
      <div className="inspector-tabs">
        <button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}>
          概览
        </button>
        {manage && (
          <>
            <button
              className={tab === 'mappings' ? 'active' : ''}
              onClick={() => setTab('mappings')}
            >
              环境映射
            </button>
            <button
              className={tab === 'metadata' ? 'active' : ''}
              onClick={() => setTab('metadata')}
            >
              元数据
            </button>
          </>
        )}
      </div>
      <div className="inspector-content">
        {error && <ErrorBanner error={error} />}{' '}
        {tab === 'overview' && (
          <>
            {manage && (
              <section>
                <div className="section-heading">
                  <h3>环境连接</h3>
                  <button className="text-button" onClick={() => setTab('mappings')}>
                    管理映射 <Icon name="chevron" size={12} />
                  </button>
                </div>
                {loading ? (
                  <Loading />
                ) : (
                  (['test', 'production'] as const).map((env) => {
                    const c = connectionFor(env);
                    return (
                      <div className="environment-card" key={env}>
                        <div className="environment-top">
                          <Environment value={env} />
                          <strong>{env === 'test' ? '测试环境' : '生产环境'}</strong>
                          {env === 'production' && <Icon name="lock" size={13} />}
                          <span className="grow" />
                          {c ? (
                            <Status value={c.lastHealthStatus} />
                          ) : (
                            <span className="muted">未配置</span>
                          )}
                        </div>
                        {c ? (
                          <>
                            <p className="mono endpoint-value">
                              {c.host}:{c.port}
                            </p>
                            <div className="environment-bottom">
                              <span>{c.databaseName}</span>
                              <Button
                                disabled={
                                  busyConnections.has(c.id) ||
                                  !me.permissions.includes('connection.test.' + env)
                                }
                                onClick={() => actions.onCheck(c)}
                              >
                                {busyConnections.has(c.id) ? '正在执行…' : '测试连接'}
                              </Button>
                            </div>
                          </>
                        ) : (
                          <p className="helper">
                            {env === 'test'
                              ? '配置测试连接后，业务人员可使用授权的数据集。'
                              : '生产连接由独立权限管理，仅用于批准的运行服务。'}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </section>
            )}
            <section className="inspector-section">
              <h3>业务归属</h3>
              <dl className="details-list">
                <dt>业务系统</dt>
                <dd>{source.systemCode}</dd>
                <dt>数据库</dt>
                <dd>{engineName(source.engine)}</dd>
                <dt>归属部门</dt>
                <dd>{source.department}</dd>
                <dt>负责人</dt>
                <dd>
                  <span className="mini-person">
                    <span className="avatar mini">
                      {(source.ownerDisplayName ?? '成员').slice(-2)}
                    </span>
                    {source.ownerDisplayName ?? '已指定负责人'}
                  </span>
                </dd>
                <dt>敏感级别</dt>
                <dd>{sensitivityName(source.sensitivity)}</dd>
                <dt>启用状态</dt>
                <dd>
                  <Status value={source.status} />
                </dd>
                <dt>最近更新</dt>
                <dd className="mono">{formatDate(source.updatedAt)}</dd>
              </dl>
            </section>
            <section className="inspector-section">
              <div className="section-heading">
                <h3>业务数据集</h3>
                <span className="muted">
                  {datasets.filter((d) => d.logicalDataSourceId === source.id).length}
                </span>
              </div>
              {datasets
                .filter((d) => d.logicalDataSourceId === source.id)
                .map((d) => (
                  <div className="related-dataset" key={d.id}>
                    <Icon name="table" size={17} />
                    <span>
                      {d.name}
                      <small>{d.description}</small>
                    </span>
                    <Status value={d.status} />
                  </div>
                ))}
              {!datasets.some((d) => d.logicalDataSourceId === source.id) && (
                <p className="helper">当前暂无可访问的数据集。</p>
              )}
            </section>
          </>
        )}
        {tab === 'mappings' && (
          <>
            <div className="inspector-section-intro">
              <h3>测试与生产分别映射</h3>
              <p>目标必须与环境和数据库类型一致，并已完成连接检查与结构同步。</p>
            </div>
            {(['test', 'production'] as const).map((env) => {
              const current = connectionFor(env);
              return (
                <section className="mapping-editor" key={env}>
                  <div className="section-heading">
                    <div className="inline">
                      <Environment value={env} />
                      <h3>{env === 'test' ? '业务开发环境' : '生产运行环境'}</h3>
                    </div>
                    {env === 'production' && <Icon name="lock" size={15} />}
                  </div>
                  <label className="field">
                    <span>物理连接</span>
                    <select
                      aria-label={env === 'test' ? 'TEST 物理连接' : 'PROD 物理连接'}
                      value={chosen[env] ?? ''}
                      onChange={(e) => setChosen({ ...chosen, [env]: e.target.value })}
                    >
                      <option value="">选择可用连接</option>
                      {connections
                        .filter(
                          (c) =>
                            c.environment === env &&
                            c.engine === source.engine &&
                            c.status === 'active',
                        )
                        .map((c) => (
                          <option value={c.id} key={c.id}>
                            {c.name}
                            {c.lastHealthStatus !== 'healthy' ? ' · 尚未通过检查' : ''}
                          </option>
                        ))}
                    </select>
                  </label>
                  {current && (
                    <p className="helper">
                      当前修订 R{mappings.find((m) => m.environment === env)?.revision} ·{' '}
                      {current.databaseName}
                    </p>
                  )}
                  <div className="mapping-actions">
                    <Button
                      variant="quiet"
                      icon="plus"
                      onClick={() => actions.onCreateConnection(env)}
                    >
                      新建连接
                    </Button>
                    <Button
                      variant="primary"
                      disabled={!chosen[env] || !!saving || source.status !== 'enabled'}
                      onClick={() => void bind(env)}
                    >
                      {saving === env ? '正在保存…' : '保存映射'}
                    </Button>
                  </div>
                </section>
              );
            })}
            <p className="helper with-icon">
              <Icon name="lock" size={15} />
              生产映射变更会使既有运行授权失效，需重新审批。
            </p>
          </>
        )}
        {tab === 'metadata' && (
          <>
            <div className="segmented metadata-env">
              {(['test', 'production'] as const).map((env) => (
                <button
                  key={env}
                  className={environment === env ? 'active' : ''}
                  disabled={!me.permissions.includes('connection.metadata.' + env)}
                  onClick={() => setEnvironment(env)}
                >
                  {env === 'test' ? 'TEST 测试结构' : 'PROD 生产结构'}
                </button>
              ))}
            </div>
            <MetadataBrowser
              api={api}
              connection={connectionFor(environment)}
              revision={revision}
              onSync={actions.onSync}
              canSync={me.permissions.includes('connection.metadata.' + environment)}
            />
          </>
        )}
      </div>
    </aside>
  );
}
export function ConnectionInspector({
  api,
  connection,
  me,
  revision,
  busy,
  onEdit,
  onCheck,
  onSync,
}: {
  api: Api;
  connection: S['PhysicalConnection'];
  me: S['CurrentUser'];
  revision: number;
  busy: boolean;
  onEdit: () => void;
  onCheck: () => void;
  onSync: (connection: S['PhysicalConnection']) => void;
}) {
  const [tab, setTab] = useState<'overview' | 'metadata'>('overview');
  return (
    <aside className="inspector">
      <div className="inspector-title">
        <div className="entity-icon">
          <Icon name="database" size={22} />
        </div>
        <div>
          <h2>{connection.name}</h2>
          <code>{engineName(connection.engine)}</code>
        </div>
        <button className="icon-button" aria-label="编辑连接" title="编辑连接" onClick={onEdit}>
          <Icon name="edit" size={17} />
        </button>
      </div>
      <div className="inspector-description inline">
        <Environment value={connection.environment} />
        <Status value={connection.lastHealthStatus} />
      </div>
      <div className="inspector-tabs">
        <button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}>
          连接概览
        </button>
        <button
          className={tab === 'metadata' ? 'active' : ''}
          disabled={!me.permissions.includes('connection.metadata.' + connection.environment)}
          onClick={() => setTab('metadata')}
        >
          元数据
        </button>
      </div>
      <div className="inspector-content">
        {tab === 'overview' ? (
          <>
            <div className="connection-address">
              <Icon name="database" size={20} />
              <div>
                <code>
                  {connection.host}:{connection.port}
                </code>
                <span>{connection.databaseName}</span>
              </div>
            </div>
            <div className="connection-actions">
              <Button
                icon="refresh"
                disabled={
                  busy ||
                  !me.permissions.includes('connection.test.' + connection.environment) ||
                  connection.status !== 'active'
                }
                onClick={onCheck}
              >
                {busy ? '正在执行…' : '测试连接'}
              </Button>
              <Button
                onClick={() => onSync(connection)}
                disabled={
                  busy ||
                  !me.permissions.includes('connection.metadata.' + connection.environment) ||
                  connection.status !== 'active'
                }
              >
                同步元数据
              </Button>
            </div>
            <section className="inspector-section">
              <h3>连接配置</h3>
              <dl className="details-list">
                <dt>连接状态</dt>
                <dd>
                  <Status value={connection.status} />
                </dd>
                <dt>连接超时</dt>
                <dd>{connection.connectTimeoutMs.toLocaleString()} ms</dd>
                <dt>读取超时</dt>
                <dd>{connection.requestTimeoutMs.toLocaleString()} ms</dd>
                <dt>连接上限</dt>
                <dd>{connection.poolMax}</dd>
                <dt>最近检查</dt>
                <dd className="mono">{formatDate(connection.lastCheckedAt)}</dd>
                <dt>凭据修订</dt>
                <dd>R{connection.credentialRevision}</dd>
              </dl>
            </section>
            <section className="inspector-section">
              <div className="section-heading">
                <h3>授权结构范围</h3>
                <span className="muted">{connection.metadataScope.length}</span>
              </div>
              {connection.metadataScope.map((r) => (
                <div className="scope-relation" key={r.schema + '.' + r.name}>
                  <Icon name="table" size={15} />
                  <code>
                    {r.schema}.{r.name}
                  </code>
                </div>
              ))}
            </section>
            <p className="helper with-icon">
              <Icon name="lock" size={15} />
              访问使用只读账号。凭据不会显示在管理界面。
            </p>
          </>
        ) : (
          <MetadataBrowser
            api={api}
            connection={connection}
            revision={revision}
            onSync={onSync}
            canSync={me.permissions.includes('connection.metadata.' + connection.environment)}
          />
        )}
      </div>
    </aside>
  );
}
export function DatasetInspector({
  api,
  dataset,
  source,
  admin,
  revision,
  onEdit,
  onVersion,
  onPreview,
}: {
  api: Api;
  dataset: S['Dataset'];
  source: S['LogicalDataSource'] | undefined;
  admin: boolean;
  revision: number;
  onEdit: () => void;
  onVersion: (version: S['DatasetVersion'] | null) => void;
  onPreview: (versions: S['DatasetVersion'][]) => void;
}) {
  const [tab, setTab] = useState<'fields' | 'metrics' | 'relationships'>('fields'),
    [versions, setVersions] = useState<S['DatasetVersion'][]>([]),
    [versionId, setVersionId] = useState(''),
    [loading, setLoading] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setError('');
    void api
      .list<S['DatasetVersion']>('/datasets/' + dataset.id + '/versions', abort.signal)
      .then((rows) => {
        setVersions(rows);
        setVersionId(rows[0]?.id ?? '');
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [api, dataset.id, revision]);
  const version = versions.find((v) => v.id === versionId) ?? null;
  return (
    <aside className="inspector dataset-inspector">
      <div className="inspector-title">
        <div className="entity-icon">
          <Icon name="table" size={22} />
        </div>
        <div>
          <h2>{dataset.name}</h2>
          <code>{dataset.key}</code>
        </div>
        {admin && (
          <button
            className="icon-button"
            aria-label="编辑数据集"
            title="编辑数据集"
            onClick={onEdit}
          >
            <Icon name="edit" size={17} />
          </button>
        )}
      </div>
      <p className="inspector-description">{dataset.description || '此数据集尚未填写业务说明。'}</p>
      <div className="dataset-context">
        <span>
          <Icon name="database" size={14} />
          {source?.name ?? '业务数据源'}
        </span>
        <Status value={dataset.status} />
      </div>
      <div className="dataset-actions">
        {admin && (
          <Button icon="plus" onClick={() => onVersion(version)}>
            新建语义版本
          </Button>
        )}
        {dataset.canPreview && (
          <Button
            variant="primary"
            icon="arrow"
            disabled={!version}
            onClick={() => onPreview(versions)}
          >
            测试预览
          </Button>
        )}
      </div>
      {error && <ErrorBanner error={error} />}{' '}
      {loading ? (
        <Loading />
      ) : !version ? (
        <Empty
          icon="table"
          title="尚未定义语义版本"
          description="选择已同步的表或视图，定义业务字段、维度与指标。"
          action={
            admin ? (
              <Button icon="plus" onClick={() => onVersion(null)}>
                定义数据集语义
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="version-select-bar">
            <span className="tiny-label">VERSION</span>
            <select
              aria-label="查看语义版本"
              value={version.id}
              onChange={(e) => setVersionId(e.target.value)}
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  V{v.version} · {formatDate(v.createdAt)}
                </option>
              ))}
            </select>
            <Icon name="lock" size={13} />
          </div>
          <div className="inspector-tabs">
            <button className={tab === 'fields' ? 'active' : ''} onClick={() => setTab('fields')}>
              字段 <span>{version.fields.length}</span>
            </button>
            <button className={tab === 'metrics' ? 'active' : ''} onClick={() => setTab('metrics')}>
              指标 <span>{version.metrics.length}</span>
            </button>
            <button
              className={tab === 'relationships' ? 'active' : ''}
              onClick={() => setTab('relationships')}
            >
              关联 <span>{version.relationships.length}</span>
            </button>
          </div>
          <div className="inspector-content">
            {tab === 'fields' && (
              <>
                <div className="relation-label">
                  <Icon name="table" size={14} />
                  <code>
                    {version.relation.schema}.{version.relation.name}
                  </code>
                </div>
                {version.fields.map((f) => (
                  <div className="semantic-field" key={f.key}>
                    <div>
                      <strong>{f.name}</strong>
                      <span className="type-tag">{f.dataType}</span>
                      {f.isDimension && <span className="dimension-label">维度</span>}
                    </div>
                    <code>{f.key}</code>
                    {f.description && f.description !== f.name && <p>{f.description}</p>}
                    <small>
                      {f.filterable ? '允许过滤' : '不可过滤'} ·{' '}
                      {f.classification === 'sensitive'
                        ? '敏感字段'
                        : f.classification === 'public'
                          ? '公开字段'
                          : '内部字段'}
                    </small>
                  </div>
                ))}
              </>
            )}
            {tab === 'metrics' &&
              (!version.metrics.length ? (
                <Empty
                  icon="chart"
                  title="暂无业务指标"
                  description="此版本可使用已授权字段进行明细预览。"
                />
              ) : (
                version.metrics.map((m) => (
                  <article className="semantic-metric" key={m.key}>
                    <div className="section-heading">
                      <h3>{m.name}</h3>
                      <code className="aggregate">{m.aggregate.toUpperCase()}</code>
                    </div>
                    <code>{m.key}</code>
                    <p>{m.businessDefinition}</p>
                    {m.description && <p className="muted">{m.description}</p>}
                    <div className="metric-facts">
                      <span>聚合字段</span>
                      <strong>
                        {version.fields.find((f) => f.key === m.fieldKey)?.name ?? m.fieldKey}
                      </strong>
                      <span>可用维度</span>
                      <strong>
                        {m.availableDimensions
                          .map((k) => version.fields.find((f) => f.key === k)?.name ?? k)
                          .join('、') || '不分组'}
                      </strong>
                      <span>过滤规则</span>
                      <strong>
                        {m.filters.length
                          ? m.filters
                              .map(
                                (f) =>
                                  (version.fields.find((k) => k.key === f.fieldKey)?.name ??
                                    f.fieldKey) +
                                  ' ' +
                                  f.operator +
                                  ' ' +
                                  (Array.isArray(f.value) ? f.value.join(', ') : String(f.value)),
                              )
                              .join('；')
                          : '不增加额外过滤'}
                      </strong>
                    </div>
                  </article>
                ))
              ))}
            {tab === 'relationships' &&
              (!version.relationships.length ? (
                <Empty
                  icon="link"
                  title="暂无关联关系"
                  description="此数据集使用单个授权表或视图。"
                />
              ) : (
                version.relationships.map((r) => (
                  <article className="semantic-metric" key={r.key}>
                    <h3>{r.key}</h3>
                    <p>{r.description}</p>
                    <div className="inline">
                      <code>{r.sourceFieldKey}</code>
                      <Icon name="arrow" size={15} />
                      <code>{r.targetFieldKey}</code>
                    </div>
                    <small className="muted">{r.cardinality} · 固定目标版本</small>
                  </article>
                ))
              ))}
          </div>
        </>
      )}
    </aside>
  );
}
