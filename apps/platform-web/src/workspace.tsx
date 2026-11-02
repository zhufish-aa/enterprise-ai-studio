import { ReleasesPage, ProductionSitePage } from './releases.js';
import { EndpointManager } from './network-endpoints.js';
import { RegistrationInvitations } from './registration-invitations.js';
import {
  AccountLogin,
  FirstPasswordChange,
  AuthenticationLoading,
  PasswordFields,
  hydrateSession,
  type WebSession,
} from './authentication.js';
import { PersonalTokens } from './personal-tokens.js';
import { SharedSitePage } from './shared-site.js';
import { StudioPage } from './studio-page.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Api, ApiError, type S, failureMessage } from './api.js';
import { Icon, Mark, type IconName } from './icons.js';
import {
  Button,
  IconButton,
  Empty,
  Status,
  Environment,
  Loading,
  ErrorBanner,
  Dialog,
  formatDate,
} from './components.js';
import {
  SourceDialog,
  ConnectionDialog,
  SyncDialog,
  DatasetDialog,
  engineName,
  sensitivityName,
} from './forms.js';
import { VersionEditor } from './version-editor.js';
import { PermissionsPage, PreviewDialog } from './data-views.js';
import { SourceInspector, ConnectionInspector, DatasetInspector } from './inspectors.js';
type Session = WebSession;
type Page = 'releases' | 'apps' | 'sources' | 'connections' | 'datasets' | 'permissions';
type Overlay =
  | { kind: 'source'; value: S['LogicalDataSource'] | null }
  | {
      kind: 'connection';
      value: S['PhysicalConnection'] | null;
      environment: 'test' | 'production';
      engine: S['PhysicalConnection']['engine'];
    }
  | { kind: 'sync'; value: S['PhysicalConnection'] }
  | { kind: 'dataset'; value: S['Dataset'] | null }
  | { kind: 'version'; dataset: S['Dataset']; previous: S['DatasetVersion'] | null }
  | { kind: 'preview'; dataset: S['Dataset']; versions: S['DatasetVersion'][] }
  | { kind: 'adapters' }
  | null;
interface Data {
  sources: S['LogicalDataSource'][];
  datasets: S['Dataset'][];
  connections: S['PhysicalConnection'][];
  endpoints: S['NetworkEndpoint'][];
  profiles: S['CredentialProfile'][];
  members: S['OrganizationMember'][];
  adapters: S['AdapterStatus'][];
  mappings: Record<string, S['SourceMapping'][]>;
}
const blank: Data = {
  sources: [],
  datasets: [],
  connections: [],
  endpoints: [],
  profiles: [],
  members: [],
  adapters: [],
  mappings: {},
};
function Workspace({
  session,
  onSession,
  onLogout,
}: {
  session: Session;
  onSession: (session: Session) => void;
  onLogout: () => void;
}) {
  const { me, token, csrfToken } = session,
    api = useMemo(
      () => new Api(token, me.organizationId, csrfToken),
      [token, me.organizationId, csrfToken],
    );
  const [endpointsOpen, setEndpointsOpen] = useState(false),
    [requestedPage, setRequestedPage] = useState<Page>(
      new URLSearchParams(location.search).get('section') === 'releases' ? 'releases' : 'apps',
    ),
    [data, setData] = useState<Data>(blank),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [query, setQuery] = useState(''),
    [engineFilter, setEngineFilter] = useState(''),
    [statusFilter, setStatusFilter] = useState(''),
    [selectedSource, setSelectedSource] = useState(''),
    [selectedConnection, setSelectedConnection] = useState(''),
    [selectedDataset, setSelectedDataset] = useState(''),
    [overlay, setOverlay] = useState<Overlay>(null),
    [revision, setRevision] = useState(0),
    [busyConnections, setBusyConnections] = useState<Set<string>>(new Set()),
    [tokensOpen, setTokensOpen] = useState(false),
    [invitationsOpen, setInvitationsOpen] = useState(false),
    [passwordOpen, setPasswordOpen] = useState(false),
    [toast, setToast] = useState<{
      kind: 'info' | 'success' | 'error';
      text: string;
      retryId?: string;
    } | null>(null);
  const admin = me.permissions.includes('catalog.manage'),
    canConnections = me.permissions.includes('connection.manage') && me.clientKind === 'human',
    canPermissions = me.permissions.includes('permission.manage') && me.clientKind === 'human',
    canMappings = me.permissions.includes('mapping.manage') && me.clientKind === 'human';
  const page: Page =
    (requestedPage === 'connections' && !canConnections) ||
    (requestedPage === 'permissions' && !canPermissions)
      ? 'sources'
      : requestedPage;
  const live = useRef(true),
    polls = useRef<Set<AbortController>>(new Set());
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      for (const abort of polls.current) abort.abort();
    };
  }, [api]);
  const notify = (text: string, kind: 'info' | 'success' | 'error' = 'error') =>
    setToast({ text, kind });
  const reload = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError('');
      try {
        const [sources, datasets, adapters, connections, endpoints, profiles, members] =
          await Promise.all([
            api.list<S['LogicalDataSource']>('/logical-data-sources', signal),
            api.list<S['Dataset']>('/datasets', signal),
            api.list<S['AdapterStatus']>('/database-adapters', signal),
            canConnections
              ? api.list<S['PhysicalConnection']>('/physical-connections', signal)
              : Promise.resolve([]),
            canConnections
              ? api.list<S['NetworkEndpoint']>('/network-endpoints', signal)
              : Promise.resolve([]),
            canConnections
              ? api.list<S['CredentialProfile']>('/credential-profiles', signal)
              : Promise.resolve([]),
            canPermissions
              ? api.list<S['OrganizationMember']>(
                  '/organizations/' + api.organizationId + '/members',
                  signal,
                )
              : Promise.resolve([]),
          ]);
        const mappings = canMappings
          ? Object.fromEntries(
              await Promise.all(
                sources.map(async (s) => [
                  s.id,
                  await api.list<S['SourceMapping']>(
                    '/logical-data-sources/' + s.id + '/mappings',
                    signal,
                  ),
                ]),
              ),
            )
          : {};
        if (signal?.aborted || !live.current) return;
        setData({
          sources,
          datasets,
          adapters,
          connections,
          endpoints,
          profiles,
          members,
          mappings,
        });
        setSelectedSource((current) =>
          sources.some((s) => s.id === current) ? current : (sources[0]?.id ?? ''),
        );
        setSelectedConnection((current) =>
          connections.some((c) => c.id === current) ? current : (connections[0]?.id ?? ''),
        );
        setSelectedDataset((current) =>
          datasets.some((d) => d.id === current) ? current : (datasets[0]?.id ?? ''),
        );
        setRevision((v) => v + 1);
      } catch (e) {
        if (signal?.aborted) return;
        if (e instanceof ApiError && e.status === 401) {
          onLogout();
          return;
        }
        setError(e instanceof Error ? e.message : '读取数据失败。');
      } finally {
        if (!signal?.aborted && live.current) setLoading(false);
      }
    },
    [api, canConnections, canPermissions, canMappings],
  );
  useEffect(() => {
    const abort = new AbortController();
    void reload(abort.signal);
    return () => abort.abort();
  }, [reload]);
  useEffect(() => {
    setQuery('');
    setEngineFilter('');
    setStatusFilter('');
  }, [page]);
  useEffect(() => {
    if (!toast || toast.kind === 'error') return;
    const timer = setTimeout(() => setToast(null), 7000);
    return () => clearTimeout(timer);
  }, [toast]);
  const refresh = async () => {
    await reload();
  };
  const source = data.sources.find((s) => s.id === selectedSource),
    connection = data.connections.find((c) => c.id === selectedConnection),
    dataset = data.datasets.find((d) => d.id === selectedDataset);
  async function switchOrganization(id: string) {
    try {
      const next = await new Api(token, id, csrfToken).request<S['CurrentUser']>('/me');
      setData(blank);
      setSelectedSource('');
      setSelectedDataset('');
      onSession({ ...session, me: next });
    } catch (e) {
      notify(e instanceof Error ? e.message : '组织切换失败。');
    }
  }
  async function enqueue(request: Promise<S['CatalogJob']>): Promise<void> {
    const job = await request;
    setBusyConnections((current) => new Set([...current, job.physicalConnectionId]));
    setToast({
      kind: 'info',
      text: job.operation === 'health' ? '正在检查数据库连接…' : '正在同步所选数据库结构…',
    });
    const abort = new AbortController();
    polls.current.add(abort);
    void (async () => {
      let current = job;
      try {
        for (let i = 0; i < 240 && !['succeeded', 'failed'].includes(current.status); i++) {
          await new Promise((r) => setTimeout(r, 500));
          if (abort.signal.aborted) return;
          current = await api.request<S['CatalogJob']>('/catalog-jobs/' + job.id, {
            signal: abort.signal,
          });
        }
        if (!live.current || abort.signal.aborted) return;
        if (current.status === 'succeeded')
          setToast({
            kind: 'success',
            text:
              job.operation === 'health' ? '连接检查通过。' : '元数据同步完成，结构快照已保存。',
          });
        else
          setToast({
            kind: 'error',
            text: failureMessage(current.failureCode),
            ...(job.operation === 'metadata' ? { retryId: job.id } : {}),
          });
        await reload();
      } catch (e) {
        if (!abort.signal.aborted && live.current)
          notify(e instanceof Error ? e.message : '任务状态读取失败。');
      } finally {
        polls.current.delete(abort);
        if (live.current)
          setBusyConnections((set) => {
            const next = new Set(set);
            next.delete(job.physicalConnectionId);
            return next;
          });
      }
    })();
  }
  const check = (c: S['PhysicalConnection']) => {
    void enqueue(api.request('/physical-connections/' + c.id + '/tests', { method: 'POST' })).catch(
      (e) => notify(e.message),
    );
  };
  const navigate = (next: Page) => {
    setRequestedPage(next);
    setOverlay(null);
  };
  const title =
    page === 'sources'
      ? '数据源管理'
      : page === 'connections'
        ? '物理连接'
        : page === 'datasets'
          ? '业务数据集'
          : '访问权限';
  const subtitle =
    page === 'sources'
      ? '连接业务系统，建立统一的数据目录。'
      : page === 'connections'
        ? '以明确的环境边界，维护可控的数据连接。'
        : page === 'datasets'
          ? '让字段、维度和指标拥有一致的业务含义。'
          : '让合适的成员，使用明确范围内的数据。';
  const sourceRows = data.sources.filter(
    (s) =>
      (!query ||
        [s.name, s.key, s.systemCode, s.department].some((v) =>
          v.toLowerCase().includes(query.toLowerCase()),
        )) &&
      (!engineFilter || s.engine === engineFilter) &&
      (!statusFilter || s.status === statusFilter),
  );
  const connectionRows = data.connections.filter(
    (c) =>
      (!query ||
        [c.name, c.databaseName, c.host].some((v) =>
          v.toLowerCase().includes(query.toLowerCase()),
        )) &&
      (!engineFilter || c.engine === engineFilter) &&
      (!statusFilter || c.environment === statusFilter),
  );
  const datasetRows = data.datasets.filter(
    (d) =>
      (!query ||
        [d.name, d.key, d.description].some((v) =>
          v.toLowerCase().includes(query.toLowerCase()),
        )) &&
      (!statusFilter || d.status === statusFilter),
  );
  const primaryAction =
    page === 'sources' && admin
      ? () => setOverlay({ kind: 'source', value: null })
      : page === 'connections' && canConnections
        ? () =>
            setOverlay({
              kind: 'connection',
              value: null,
              environment: 'test',
              engine: 'postgresql',
            })
        : page === 'datasets' && admin
          ? () => setOverlay({ kind: 'dataset', value: null })
          : null;
  const count =
    page === 'sources'
      ? data.sources.length
      : page === 'connections'
        ? data.connections.length
        : page === 'datasets'
          ? data.datasets.length
          : null;
  const navs: { page: Page; label: string; icon: IconName; visible: boolean }[] = [
    {
      page: 'releases',
      label: '上线发布',
      icon: 'shield',
      visible: me.permissions.includes('release.read'),
    },
    { page: 'apps', label: '我的应用', icon: 'chart', visible: true },
    { page: 'sources', label: '数据源', icon: 'database', visible: true },
    { page: 'connections', label: '物理连接', icon: 'link', visible: canConnections },
    { page: 'datasets', label: '业务数据集', icon: 'table', visible: true },
    { page: 'permissions', label: '访问权限', icon: 'shield', visible: canPermissions },
  ];
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <Mark />
          <span>
            Enterprise<b>AI Studio</b>
          </span>
        </div>
        <div className="sidebar-section-label">WORKSPACE</div>
        <nav aria-label="工作空间导航">
          {navs
            .filter((n) => n.visible)
            .map((n) => (
              <button
                className={page === n.page ? 'active' : ''}
                key={n.page}
                aria-label={n.label}
                title={n.label}
                onClick={() => navigate(n.page)}
                aria-current={page === n.page ? 'page' : undefined}
              >
                <Icon name={n.icon} />
                <span>{n.label}</span>
                {n.page === 'datasets' && data.datasets.length > 0 && (
                  <small>{data.datasets.length}</small>
                )}
              </button>
            ))}
        </nav>
        <div className="sidebar-bottom">
          {me.permissions.includes('account.manage') && (
            <button className="sidebar-secondary" onClick={() => setInvitationsOpen(true)}>
              <Icon name="settings" size={17} />
              <span>注册设置</span>
            </button>
          )}
          <button className="sidebar-secondary" onClick={() => setPasswordOpen(true)}>
            <Icon name="shield" size={17} />
            <span>账户安全</span>
          </button>
          <button className="sidebar-secondary" onClick={() => setTokensOpen(true)}>
            <Icon name="lock" size={17} />
            <span>个人访问令牌</span>
          </button>
          <button
            className="sidebar-secondary"
            aria-label="数据库适配器"
            title="数据库适配器"
            onClick={() => setOverlay({ kind: 'adapters' })}
          >
            <Icon name="code" size={17} />
            <span>数据库适配器</span>
          </button>
          <div className="sidebar-system-status">
            <span className="small-dot" />
            <span>统一数据目录</span>
            <code>v0.2</code>
          </div>
          <div className="user-profile">
            <span className="avatar">{me.displayName.slice(-2)}</span>
            <div>
              <strong>{me.displayName}</strong>
              <small>{admin ? '数据管理员' : '业务成员'}</small>
            </div>
            <IconButton icon="logout" label="退出登录" onClick={onLogout} />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            工作空间 <span>/</span>
            <strong>
              {page === 'releases' ? '上线发布' : page === 'apps' ? '应用工作室' : '数据目录'}
            </strong>
          </div>
          <div className="topbar-actions">
            <span className="identity-status">
              <Icon name="shield" size={14} />
              {me.clientKind === 'human' ? '成员会话' : 'AI 客户端'}
            </span>
            <div className="org-switch">
              <Icon name="folder" size={15} />
              <select
                aria-label="当前组织"
                value={me.organizationId ?? ''}
                onChange={(e) => void switchOrganization(e.target.value)}
              >
                {me.organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
            <span className="avatar top-avatar">{me.displayName.slice(-1)}</span>
          </div>
        </header>
        <main className="workspace-main">
          {page === 'releases' ? (
            <ReleasesPage api={api} me={me} />
          ) : page === 'apps' ? (
            <StudioPage
              key={api.organizationId}
              api={api}
              datasets={data.datasets}
              canDevelop={me.permissions.includes('app.develop')}
            />
          ) : (
            <>
              <header className="page-heading">
                <div>
                  <div className="eyebrow">DATA CATALOG</div>
                  <div className="title-line">
                    <h1>{title}</h1>
                    {count !== null && (
                      <span className="count-tag">{String(count).padStart(2, '0')}</span>
                    )}
                  </div>
                  <p>{subtitle}</p>
                </div>
                <div className="page-actions">
                  {page === 'connections' && (
                    <Button icon="link" onClick={() => setEndpointsOpen(true)}>
                      网络端点
                    </Button>
                  )}
                  <IconButton
                    icon="refresh"
                    label="刷新数据"
                    onClick={() => void refresh()}
                    disabled={loading}
                  />
                  {primaryAction && (
                    <Button variant="primary" icon="plus" onClick={primaryAction}>
                      {page === 'sources'
                        ? '新建数据源'
                        : page === 'connections'
                          ? '新建连接'
                          : '新建数据集'}
                    </Button>
                  )}
                </div>
              </header>
              {error && (
                <div className="page-error">
                  <ErrorBanner error={error} />
                  <Button onClick={() => void refresh()}>重试</Button>
                </div>
              )}
              {page === 'permissions' ? (
                <PermissionsPage
                  api={api}
                  datasets={data.datasets}
                  sources={data.sources}
                  members={data.members}
                  onChanged={refresh}
                  onError={notify}
                />
              ) : (
                <div className="data-workspace">
                  <section className="listing-pane">
                    <div className="list-toolbar">
                      <label className="search-input">
                        <Icon name="search" size={17} />
                        <input
                          aria-label="搜索资源"
                          placeholder={
                            page === 'sources'
                              ? '搜索数据源名称、系统编码或部门…'
                              : page === 'connections'
                                ? '搜索连接名称、地址或数据库…'
                                : '搜索数据集名称或业务说明…'
                          }
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                        {query && (
                          <button aria-label="清除搜索" onClick={() => setQuery('')}>
                            <Icon name="x" size={14} />
                          </button>
                        )}
                      </label>
                      <div className="list-filters">
                        {page !== 'datasets' && (
                          <select
                            aria-label="数据库筛选"
                            value={engineFilter}
                            onChange={(e) => setEngineFilter(e.target.value)}
                          >
                            <option value="">全部数据库</option>
                            {['postgresql', 'mysql', 'sqlserver'].map((engine) => (
                              <option key={engine} value={engine}>
                                {engineName(engine)}
                              </option>
                            ))}
                          </select>
                        )}
                        <select
                          aria-label="状态筛选"
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                        >
                          <option value="">
                            {page === 'connections' ? '全部环境' : '全部状态'}
                          </option>
                          {page === 'connections' ? (
                            <>
                              <option value="test">TEST 测试</option>
                              <option value="production">PROD 生产</option>
                            </>
                          ) : (
                            <>
                              {page === 'datasets' && <option value="draft">草稿</option>}
                              <option value="enabled">已启用</option>
                              <option value="disabled">已停用</option>
                            </>
                          )}
                        </select>
                      </div>
                    </div>
                    {loading && data.sources.length === 0 && data.datasets.length === 0 ? (
                      <Loading />
                    ) : page === 'sources' ? (
                      sourceRows.length ? (
                        <div className="table-scroll">
                          <table className="resource-table">
                            <thead>
                              <tr>
                                <th>数据源</th>
                                <th>数据库</th>
                                <th>归属部门</th>
                                <th>{canMappings ? '环境连接' : '访问范围'}</th>
                                <th>状态</th>
                                <th />
                              </tr>
                            </thead>
                            <tbody>
                              {sourceRows.map((s) => (
                                <tr
                                  className={s.id === selectedSource ? 'selected' : ''}
                                  key={s.id}
                                  onClick={() => setSelectedSource(s.id)}
                                >
                                  <td>
                                    <button
                                      className="row-entity"
                                      onClick={() => setSelectedSource(s.id)}
                                    >
                                      <span className="entity-icon">
                                        <Icon
                                          name={
                                            s.engine === 'sqlserver'
                                              ? 'columns'
                                              : s.engine === 'mysql'
                                                ? 'table'
                                                : 'chart'
                                          }
                                          size={20}
                                        />
                                      </span>
                                      <span>
                                        <strong>{s.name}</strong>
                                        <code>{s.key}</code>
                                      </span>
                                    </button>
                                  </td>
                                  <td>
                                    <span className="database-label">{engineName(s.engine)}</span>
                                  </td>
                                  <td>
                                    <span>{s.department}</span>
                                    <small>{sensitivityName(s.sensitivity)}</small>
                                  </td>
                                  <td>
                                    <div className="environment-pair">
                                      {canMappings ? (
                                        data.mappings[s.id]?.length ? (
                                          data.mappings[s.id]?.map((m) => (
                                            <span
                                              className="environment-summary"
                                              key={m.environment}
                                            >
                                              <Environment value={m.environment} />
                                              <i
                                                className={
                                                  data.connections.find(
                                                    (c) => c.id === m.physicalConnectionId,
                                                  )?.lastHealthStatus === 'healthy'
                                                    ? 'small-dot'
                                                    : 'small-dot muted-dot'
                                                }
                                              />
                                            </span>
                                          ))
                                        ) : (
                                          <span className="muted">尚未配置</span>
                                        )
                                      ) : (
                                        <span className="scope-label">
                                          <Icon name="shield" size={13} />
                                          授权测试目录
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td>
                                    <Status value={s.status} />
                                  </td>
                                  <td>
                                    <Icon name="chevron" size={15} />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <Empty
                          title={
                            query || engineFilter || statusFilter
                              ? '没有匹配的数据源'
                              : '暂无可访问的数据源'
                          }
                          description={
                            admin
                              ? '新建数据源，为业务系统配置明确的数据归属。'
                              : '获得资源授权后，可在这里浏览业务数据目录。'
                          }
                          action={
                            admin && !query ? (
                              <Button
                                icon="plus"
                                onClick={() => setOverlay({ kind: 'source', value: null })}
                              >
                                新建数据源
                              </Button>
                            ) : undefined
                          }
                        />
                      )
                    ) : page === 'connections' ? (
                      connectionRows.length ? (
                        <div className="table-scroll">
                          <table className="resource-table">
                            <thead>
                              <tr>
                                <th>物理连接</th>
                                <th>环境</th>
                                <th>连接目标</th>
                                <th>健康状态</th>
                                <th>最近检查</th>
                                <th />
                              </tr>
                            </thead>
                            <tbody>
                              {connectionRows.map((c) => (
                                <tr
                                  key={c.id}
                                  className={selectedConnection === c.id ? 'selected' : ''}
                                  onClick={() => setSelectedConnection(c.id)}
                                >
                                  <td>
                                    <button
                                      className="row-entity"
                                      onClick={() => setSelectedConnection(c.id)}
                                    >
                                      <span className="entity-icon">
                                        <Icon name="database" size={20} />
                                      </span>
                                      <span>
                                        <strong>{c.name}</strong>
                                        <small>{engineName(c.engine)}</small>
                                      </span>
                                    </button>
                                  </td>
                                  <td>
                                    <Environment value={c.environment} />
                                  </td>
                                  <td>
                                    <code>
                                      {c.host}:{c.port}
                                    </code>
                                    <small>{c.databaseName}</small>
                                  </td>
                                  <td>
                                    {busyConnections.has(c.id) ? (
                                      <span className="status">
                                        <span className="spinner small" />
                                        正在执行
                                      </span>
                                    ) : (
                                      <Status value={c.lastHealthStatus} />
                                    )}
                                  </td>
                                  <td className="date-cell">{formatDate(c.lastCheckedAt)}</td>
                                  <td>
                                    <Icon name="chevron" size={15} />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <Empty
                          title="暂无物理连接"
                          description="填写主机、端口、数据库和账号，分别维护测试与生产连接。"
                          action={
                            <Button
                              icon="plus"
                              onClick={() =>
                                setOverlay({
                                  kind: 'connection',
                                  value: null,
                                  environment: 'test',
                                  engine: 'postgresql',
                                })
                              }
                            >
                              新建连接
                            </Button>
                          }
                        />
                      )
                    ) : datasetRows.length ? (
                      <div className="table-scroll">
                        <table className="resource-table">
                          <thead>
                            <tr>
                              <th>业务数据集</th>
                              <th>来源数据源</th>
                              <th>状态</th>
                              <th>最近更新</th>
                              <th />
                            </tr>
                          </thead>
                          <tbody>
                            {datasetRows.map((d) => (
                              <tr
                                key={d.id}
                                className={selectedDataset === d.id ? 'selected' : ''}
                                onClick={() => setSelectedDataset(d.id)}
                              >
                                <td>
                                  <button
                                    className="row-entity"
                                    onClick={() => setSelectedDataset(d.id)}
                                  >
                                    <span className="entity-icon">
                                      <Icon name="table" size={20} />
                                    </span>
                                    <span>
                                      <strong>{d.name}</strong>
                                      <code>{d.key}</code>
                                    </span>
                                  </button>
                                </td>
                                <td>
                                  {data.sources.find((s) => s.id === d.logicalDataSourceId)?.name ??
                                    '已授权数据源'}
                                  <small>{d.description}</small>
                                </td>
                                <td>
                                  <Status value={d.status} />
                                </td>
                                <td className="date-cell">{formatDate(d.updatedAt)}</td>
                                <td>
                                  <Icon name="chevron" size={15} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <Empty
                        icon="table"
                        title={query ? '没有匹配的数据集' : '暂无可访问的数据集'}
                        description={
                          admin
                            ? '基于已同步的表或视图，定义业务字段和指标。'
                            : '获得数据集授权后，即可查看结构与测试预览能力。'
                        }
                        action={
                          admin && !query ? (
                            <Button
                              icon="plus"
                              onClick={() => setOverlay({ kind: 'dataset', value: null })}
                            >
                              新建数据集
                            </Button>
                          ) : undefined
                        }
                      />
                    )}
                    <footer className="list-footer">
                      <span>
                        共{' '}
                        {page === 'sources'
                          ? sourceRows.length
                          : page === 'connections'
                            ? connectionRows.length
                            : datasetRows.length}{' '}
                        项{query ? '匹配结果' : ''}
                      </span>
                      <span>
                        <Icon name="shield" size={13} />
                        按当前权限展示
                      </span>
                    </footer>
                  </section>
                  {page === 'sources' && source ? (
                    <SourceInspector
                      key={source.id}
                      api={api}
                      source={source}
                      datasets={data.datasets}
                      connections={data.connections}
                      me={me}
                      revision={revision}
                      busyConnections={busyConnections}
                      onEdit={() => setOverlay({ kind: 'source', value: source })}
                      onCreateConnection={(environment) =>
                        setOverlay({
                          kind: 'connection',
                          value: null,
                          environment,
                          engine: source.engine,
                        })
                      }
                      onCheck={check}
                      onSync={(c) => setOverlay({ kind: 'sync', value: c })}
                      onRefresh={refresh}
                      onError={notify}
                    />
                  ) : page === 'connections' && connection ? (
                    <ConnectionInspector
                      key={connection.id}
                      api={api}
                      connection={connection}
                      me={me}
                      revision={revision}
                      busy={busyConnections.has(connection.id)}
                      onEdit={() =>
                        setOverlay({
                          kind: 'connection',
                          value: connection,
                          environment: connection.environment,
                          engine: connection.engine,
                        })
                      }
                      onCheck={() => check(connection)}
                      onSync={(c) => setOverlay({ kind: 'sync', value: c })}
                    />
                  ) : page === 'datasets' && dataset ? (
                    <DatasetInspector
                      key={dataset.id}
                      api={api}
                      dataset={dataset}
                      source={data.sources.find((s) => s.id === dataset.logicalDataSourceId)}
                      admin={admin}
                      revision={revision}
                      onEdit={() => setOverlay({ kind: 'dataset', value: dataset })}
                      onVersion={(previous) => setOverlay({ kind: 'version', dataset, previous })}
                      onPreview={(versions) => setOverlay({ kind: 'preview', dataset, versions })}
                    />
                  ) : (
                    <aside className="inspector inspector-empty">
                      <Icon name={page === 'datasets' ? 'table' : 'database'} size={30} />
                      <p>选择一项资源查看详情</p>
                    </aside>
                  )}
                </div>
              )}
            </>
          )}
        </main>
        <footer className="workspace-footer">
          <span>Enterprise AI Studio</span>
          <span>数据边界明确，业务语义一致。</span>
        </footer>
      </div>
      {toast && (
        <div className={'toast ' + toast.kind} role={toast.kind === 'error' ? 'alert' : 'status'}>
          <Icon
            name={toast.kind === 'success' ? 'check' : toast.kind === 'error' ? 'alert' : 'clock'}
            size={18}
          />
          <div>
            <span>{toast.text}</span>
            {toast.retryId && (
              <button
                onClick={() =>
                  void enqueue(
                    api.request('/catalog-jobs/' + toast.retryId + '/retry', { method: 'POST' }),
                  ).catch((e) => notify(e.message))
                }
              >
                重试元数据同步 <Icon name="arrow" size={13} />
              </button>
            )}
          </div>
          <IconButton icon="x" label="关闭提示" onClick={() => setToast(null)} />
        </div>
      )}
      {invitationsOpen && (
        <RegistrationInvitations api={api} onClose={() => setInvitationsOpen(false)} />
      )}
      {passwordOpen && (
        <Dialog
          title="修改密码"
          subtitle="使用账号密码登录，客户端访问令牌可在令牌页单独管理。"
          onClose={() => setPasswordOpen(false)}
        >
          <div className="dialog-body">
            <PasswordFields
              api={api}
              firstLogin={false}
              onChanged={(next) => {
                setPasswordOpen(false);
                onSession(next);
              }}
            />
          </div>
        </Dialog>
      )}
      {tokensOpen && (
        <PersonalTokens
          api={api}
          human={me.clientKind === 'human'}
          onClose={() => setTokensOpen(false)}
        />
      )}
      {endpointsOpen && (
        <EndpointManager
          api={api}
          endpoints={data.endpoints}
          profiles={data.profiles}
          canManage={me.permissions.includes('network.manage') && me.clientKind === 'human'}
          onClose={() => setEndpointsOpen(false)}
          onChanged={refresh}
        />
      )}
      {overlay?.kind === 'source' && (
        <SourceDialog
          api={api}
          source={overlay.value}
          members={data.members}
          userId={me.id}
          onClose={() => setOverlay(null)}
          onSaved={async () => {
            if (!overlay.value) setSelectedSource('');
            await refresh();
            notify(overlay.value ? '数据源已更新。' : '数据源已创建。', 'success');
          }}
        />
      )}
      {overlay?.kind === 'connection' && (
        <ConnectionDialog
          canManageEndpoints={
            me.permissions.includes('network.manage') && me.clientKind === 'human'
          }
          api={api}
          connection={overlay.value}
          endpoints={data.endpoints}
          profiles={data.profiles}
          initialEnvironment={overlay.environment}
          initialEngine={overlay.engine}
          onClose={() => setOverlay(null)}
          onSaved={async () => {
            await refresh();
            notify('连接配置已保存。', 'success');
          }}
        />
      )}
      {overlay?.kind === 'sync' && (
        <SyncDialog
          connection={overlay.value}
          onClose={() => setOverlay(null)}
          onSubmit={(relations) =>
            enqueue(
              api.request('/physical-connections/' + overlay.value.id + '/metadata-syncs', {
                method: 'POST',
                body: { relations },
              }),
            )
          }
        />
      )}
      {overlay?.kind === 'dataset' && (
        <DatasetDialog
          api={api}
          dataset={overlay.value}
          sources={data.sources}
          onClose={() => setOverlay(null)}
          onSaved={async () => {
            if (!overlay.value) setSelectedDataset('');
            await refresh();
            notify('数据集资料已保存。', 'success');
          }}
        />
      )}
      {overlay?.kind === 'version' && (
        <VersionEditor
          api={api}
          dataset={overlay.dataset}
          datasets={data.datasets}
          previous={overlay.previous}
          onClose={() => setOverlay(null)}
          onSaved={async () => {
            await refresh();
            notify('新的语义版本已封存。', 'success');
          }}
        />
      )}
      {overlay?.kind === 'preview' && (
        <PreviewDialog
          api={api}
          dataset={overlay.dataset}
          versions={overlay.versions}
          onClose={() => setOverlay(null)}
        />
      )}
      {overlay?.kind === 'adapters' && (
        <Dialog
          title="数据库适配器"
          subtitle="验证状态对应实际数据库连接与结构读取的测试证据。"
          onClose={() => setOverlay(null)}
        >
          <div className="dialog-body adapter-list">
            {data.adapters.map((a) => (
              <article key={a.engine}>
                <div className="entity-icon">
                  <Icon name="database" size={21} />
                </div>
                <div>
                  <h3>{engineName(a.engine)}</h3>
                  <code>{a.driver}</code>
                  <p>
                    {a.engine === 'postgresql'
                      ? '已通过真实 PostgreSQL 18.4 的连接、结构读取与测试预览验证。'
                      : '已实现连接与元数据适配；当前环境尚无该数据库的真实实例验证。'}
                  </p>
                </div>
                <span
                  className={a.status === 'verified-real' ? 'verified-label' : 'unverified-label'}
                >
                  {a.status === 'verified-real' ? '已实测' : '待实测'}
                </span>
              </article>
            ))}
          </div>
          <footer className="dialog-footer">
            <Button onClick={() => setOverlay(null)}>关闭</Button>
          </footer>
        </Dialog>
      )}
    </div>
  );
}
export function App() {
  const [session, setSession] = useState<Session | null>(null),
    [restoring, setRestoring] = useState(true),
    shared = /^\/s\/([a-f0-9-]{36})$/i.exec(location.pathname)?.[1],
    production = /^\/p\/([a-f0-9-]{36})$/i.exec(location.pathname)?.[1];
  useEffect(() => {
    const abort = new AbortController();
    void new Api('', null)
      .request<S['BrowserSession']>('/auth/session', { signal: abort.signal })
      .then(hydrateSession)
      .then((value) => {
        if (!abort.signal.aborted) setSession(value);
      })
      .catch(() => {})
      .finally(() => {
        if (!abort.signal.aborted) setRestoring(false);
      });
    return () => abort.abort();
  }, []);
  const logout = () => {
    if (session)
      void new Api('', session.me.organizationId, session.csrfToken)
        .request('/auth/logout', { method: 'POST' })
        .catch(() => {})
        .finally(() => setSession(null));
    else setSession(null);
  };
  if (restoring) return <AuthenticationLoading />;
  if (!session) return <AccountLogin onSession={setSession} />;
  if (session.mustChangePassword)
    return <FirstPasswordChange session={session} onSession={setSession} onLogout={logout} />;
  return production ? (
    <ProductionSitePage
      api={new Api(session.token, session.me.organizationId, session.csrfToken)}
      appId={production}
      onLogout={logout}
    />
  ) : shared ? (
    <SharedSitePage
      token={session.token}
      csrfToken={session.csrfToken}
      me={session.me}
      shareId={shared}
      onLogout={logout}
    />
  ) : (
    <Workspace session={session} onSession={setSession} onLogout={logout} />
  );
}
