import { DirectConnectionDialog } from './direct-connection.js';
import { EndpointDialog } from './network-endpoints.js';
import { useState, type FormEvent } from 'react';
import { Api, type S } from './api.js';
import { Button, Dialog, Field, ErrorBanner, Environment } from './components.js';
export const engineName = (engine: string) =>
  ({ postgresql: 'PostgreSQL', mysql: 'MySQL', sqlserver: 'SQL Server' })[engine] ?? engine;
export const sensitivityName = (level: string) =>
  ({ public: '公开', internal: '内部', sensitive: '敏感', restricted: '严格受限' })[level] ?? level;
const message = (error: unknown) =>
  error instanceof Error ? error.message : '操作未能完成，请稍后重试。';
type Saved = () => Promise<void> | void;
function Footer({
  busy,
  onClose,
  label = '保存',
}: {
  busy: boolean;
  onClose: () => void;
  label?: string;
}) {
  return (
    <footer className="dialog-footer">
      <Button type="button" onClick={onClose} disabled={busy}>
        取消
      </Button>
      <Button type="submit" variant="primary" disabled={busy}>
        {busy ? '正在保存…' : label}
      </Button>
    </footer>
  );
}
export function SourceDialog({
  api,
  source,
  members,
  userId,
  onClose,
  onSaved,
}: {
  api: Api;
  source: S['LogicalDataSource'] | null;
  members: S['OrganizationMember'][];
  userId: string;
  onClose: () => void;
  onSaved: Saved;
}) {
  const [form, setForm] = useState<S['CreateLogicalDataSource']>(() =>
    source
      ? {
          key: source.key,
          name: source.name,
          systemCode: source.systemCode,
          engine: source.engine,
          description: source.description,
          department: source.department,
          ownerUserId: source.ownerUserId,
          sensitivity: source.sensitivity,
          status: source.status,
        }
      : {
          key: '',
          name: '',
          systemCode: '',
          engine: 'postgresql',
          description: '',
          department: '',
          ownerUserId: userId,
          sensitivity: 'internal',
          status: 'enabled',
        },
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm({ ...form, [k]: v });
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (source) {
        const { key: _key, engine: _engine, ...body } = form;
        await api.request('/logical-data-sources/' + source.id, {
          method: 'PATCH',
          body,
          revision: source.revision,
        });
      } else await api.request('/logical-data-sources', { method: 'POST', body: form });
      await onSaved();
      onClose();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title={source ? '编辑数据源' : '新建数据源'}
      subtitle="维护业务归属与数据责任，为连接和数据集建立统一入口。"
      onClose={onClose}
    >
      <form onSubmit={(e) => void submit(e)}>
        <div className="dialog-body form-grid">
          {error && (
            <div className="span-2">
              <ErrorBanner error={error} />
            </div>
          )}
          <Field label="数据源名称">
            <input
              autoFocus
              required
              maxLength={120}
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </Field>
          <Field label="唯一编码" hint="以小写字母开头，使用字母、数字或下划线。">
            <input
              required
              pattern="[a-z][a-z0-9_]{1,62}"
              disabled={!!source}
              value={form.key}
              onChange={(e) => set('key', e.target.value)}
              className="mono"
            />
          </Field>
          <Field label="业务系统编码">
            <input
              required
              maxLength={120}
              value={form.systemCode}
              onChange={(e) => set('systemCode', e.target.value)}
            />
          </Field>
          <Field label="数据库类型">
            <select
              value={form.engine}
              disabled={!!source}
              onChange={(e) => set('engine', e.target.value as typeof form.engine)}
            >
              {['postgresql', 'mysql', 'sqlserver'].map((v) => (
                <option key={v} value={v}>
                  {engineName(v)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="归属部门">
            <input
              required
              maxLength={120}
              value={form.department}
              onChange={(e) => set('department', e.target.value)}
            />
          </Field>
          <Field label="负责人">
            <select
              required
              value={form.ownerUserId}
              onChange={(e) => set('ownerUserId', e.target.value)}
            >
              {members
                .filter((m) => m.status === 'active')
                .map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.displayName ?? m.userId}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="数据敏感级别">
            <select
              value={form.sensitivity}
              onChange={(e) => set('sensitivity', e.target.value as typeof form.sensitivity)}
            >
              {['public', 'internal', 'sensitive', 'restricted'].map((v) => (
                <option value={v} key={v}>
                  {sensitivityName(v)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="启用状态">
            <select
              value={form.status}
              onChange={(e) => set('status', e.target.value as typeof form.status)}
            >
              <option value="enabled">启用</option>
              <option value="disabled">停用</option>
            </select>
          </Field>
          <Field label="数据源描述" wide>
            <textarea
              rows={3}
              maxLength={2000}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </Field>
        </div>
        <Footer busy={busy} onClose={onClose} label={source ? '保存更改' : '创建数据源'} />
      </form>
    </Dialog>
  );
}
export function ConnectionDialog(props: Parameters<typeof ApprovedConnectionDialog>[0]) {
  const [existing, setExisting] = useState(false);
  return !props.connection && props.canManageEndpoints && !existing ? (
    <DirectConnectionDialog
      api={props.api}
      environment={props.initialEnvironment ?? 'test'}
      engine={props.initialEngine ?? 'postgresql'}
      onClose={props.onClose}
      onSaved={props.onSaved}
      onExisting={() => setExisting(true)}
    />
  ) : (
    <ApprovedConnectionDialog {...props} />
  );
}
function ApprovedConnectionDialog({
  api,
  connection,
  endpoints,
  profiles,
  initialEnvironment = 'test',
  initialEngine = 'postgresql',
  canManageEndpoints = false,
  onClose,
  onSaved,
}: {
  api: Api;
  connection: S['PhysicalConnection'] | null;
  endpoints: S['NetworkEndpoint'][];
  profiles: S['CredentialProfile'][];
  initialEnvironment?: 'test' | 'production';
  initialEngine?: S['PhysicalConnection']['engine'];
  canManageEndpoints?: boolean;
  onClose: () => void;
  onSaved: Saved;
}) {
  const [form, setForm] = useState<S['CreatePhysicalConnection']>(() =>
    connection
      ? {
          name: connection.name,
          environment: connection.environment,
          engine: connection.engine,
          endpointId: connection.endpointId,
          databaseName: connection.databaseName,
          credentialProfileId: connection.credentialProfileId,
          connectTimeoutMs: connection.connectTimeoutMs,
          requestTimeoutMs: connection.requestTimeoutMs,
          poolMax: connection.poolMax,
          metadataScope: connection.metadataScope,
        }
      : {
          name: '',
          environment: initialEnvironment,
          engine: initialEngine,
          endpointId: '',
          databaseName: '',
          credentialProfileId: '',
          connectTimeoutMs: 5000,
          requestTimeoutMs: 10000,
          poolMax: 2,
          metadataScope: [],
        },
  );
  const [status, setStatus] = useState<'active' | 'disabled'>(connection?.status ?? 'active'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [addingEndpoint, setAddingEndpoint] = useState(false),
    [addedEndpoints, setAddedEndpoints] = useState<S['NetworkEndpoint'][]>([]),
    [addedProfiles, setAddedProfiles] = useState<S['CredentialProfile'][]>([]);
  const allEndpoints = [
      ...endpoints,
      ...addedEndpoints.filter((e) => !endpoints.some((p) => p.id === e.id)),
    ],
    allProfiles = [
      ...profiles,
      ...addedProfiles.filter((p) => !profiles.some((e) => e.id === p.id)),
    ];
  const endpoint = allEndpoints.find((e) => e.id === form.endpointId);
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm({ ...form, [key]: value });
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (!connection && !form.metadataScope.length)
        throw new Error('请明确选择至少一个允许同步的表或视图。');
      if (connection)
        await api.request('/physical-connections/' + connection.id, {
          method: 'PATCH',
          body: {
            name: form.name,
            status,
            connectTimeoutMs: form.connectTimeoutMs,
            requestTimeoutMs: form.requestTimeoutMs,
            poolMax: form.poolMax,
          },
          revision: connection.revision,
        });
      else await api.request('/physical-connections', { method: 'POST', body: form });
      await onSaved();
      onClose();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  function chooseEndpoint(id: string) {
    const target = allEndpoints.find((e) => e.id === id);
    setForm({
      ...form,
      endpointId: id,
      databaseName: target?.allowedDatabases[0] ?? '',
      metadataScope: [],
    });
  }
  if (addingEndpoint)
    return (
      <EndpointDialog
        api={api}
        environment={form.environment}
        engine={form.engine}
        profiles={allProfiles}
        onClose={() => setAddingEndpoint(false)}
        onCreated={(result) => {
          setAddedEndpoints((old) => [...old, result.endpoint]);
          if (result.credentialProfile)
            setAddedProfiles((old) => [...old, result.credentialProfile!]);
          setForm({
            ...form,
            endpointId: result.endpoint.id,
            databaseName: result.endpoint.allowedDatabases[0] ?? '',
            metadataScope: result.endpoint.allowedRelations,
            credentialProfileId: result.credentialProfile?.id ?? '',
          });
          setAddingEndpoint(false);
        }}
      />
    );
  return (
    <Dialog
      title={connection ? '编辑物理连接' : '新建物理连接'}
      subtitle="连接目标从批准的网络清单中选择，凭据由连接服务安全读取。"
      onClose={onClose}
    >
      <form onSubmit={(e) => void submit(e)}>
        <div className="dialog-body form-grid">
          {error && (
            <div className="span-2">
              <ErrorBanner error={error} />
            </div>
          )}
          <Field label="连接名称" wide>
            <input
              autoFocus
              required
              maxLength={120}
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </Field>
          <Field label="运行环境">
            <select
              value={form.environment}
              disabled={!!connection}
              onChange={(e) =>
                setForm({
                  ...form,
                  environment: e.target.value as typeof form.environment,
                  endpointId: '',
                  credentialProfileId: '',
                  databaseName: '',
                  metadataScope: [],
                })
              }
            >
              <option value="test">TEST · 测试环境</option>
              <option value="production">PROD · 生产环境</option>
            </select>
          </Field>
          <Field label="数据库类型">
            <select
              value={form.engine}
              disabled={!!connection}
              onChange={(e) =>
                setForm({
                  ...form,
                  engine: e.target.value as typeof form.engine,
                  endpointId: '',
                  credentialProfileId: '',
                  databaseName: '',
                  metadataScope: [],
                })
              }
            >
              {['postgresql', 'mysql', 'sqlserver'].map((v) => (
                <option value={v} key={v}>
                  {engineName(v)}
                </option>
              ))}
            </select>
          </Field>
          <div className="span-2">
            <div className="section-heading">
              <span className="field-heading">数据库服务器端点</span>
              {!connection && canManageEndpoints && (
                <Button
                  type="button"
                  variant="quiet"
                  icon="plus"
                  onClick={() => setAddingEndpoint(true)}
                >
                  新增网络端点
                </Button>
              )}
            </div>
            <Field
              label="选择已登记的地址"
              hint="找不到地址时点击新增网络端点。数据库和可同步对象也在端点中配置。"
            >
              <select
                required
                disabled={!!connection}
                value={form.endpointId}
                onChange={(e) => chooseEndpoint(e.target.value)}
              >
                <option value="">选择已登记的连接端点</option>
                {allEndpoints
                  .filter((e) => e.environment === form.environment && e.engine === form.engine)
                  .map((e) => (
                    <option value={e.id} key={e.id}>
                      {e.name} · {e.host}:{e.port}
                    </option>
                  ))}
              </select>
            </Field>
            {!canManageEndpoints && !connection && (
              <p className="helper">
                添加地址需要网络管理员权限，可在物理连接页的“网络端点”中查看已登记配置。
              </p>
            )}
          </div>
          {endpoint && (
            <div className="endpoint-note span-2">
              <Environment value={endpoint.environment} />
              <span className="mono">
                {endpoint.host}:{endpoint.port}
              </span>
              <span>
                {endpoint.tlsMode === 'verify-full' ? 'TLS 证书校验' : '本机隔离测试实例'}
              </span>
              <small>批准的网络范围：{endpoint.allowedCidrs.join('、')}</small>
            </div>
          )}
          <Field label="数据库名称">
            <select
              required
              disabled={!!connection}
              value={form.databaseName}
              onChange={(e) => set('databaseName', e.target.value)}
            >
              <option value="">选择数据库</option>
              {endpoint?.allowedDatabases.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </Field>
          <Field
            label="凭据别名"
            hint="只显示已绑定当前端点的别名。没有可用项时，由凭据管理员在秘密管理中登记只读账号，再通过运维配置绑定；不在此填写密码。"
          >
            <select
              required
              disabled={!!connection}
              value={form.credentialProfileId}
              onChange={(e) => set('credentialProfileId', e.target.value)}
            >
              <option value="">选择只读账号别名</option>
              {allProfiles
                .filter(
                  (p) =>
                    p.environment === form.environment &&
                    p.engine === form.engine &&
                    p.endpointIds.includes(form.endpointId),
                )
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="连接超时（毫秒）">
            <input
              required
              type="number"
              min={100}
              max={10000}
              value={form.connectTimeoutMs}
              onChange={(e) => set('connectTimeoutMs', Number(e.target.value))}
            />
          </Field>
          <Field label="读取超时（毫秒）">
            <input
              required
              type="number"
              min={100}
              max={30000}
              value={form.requestTimeoutMs}
              onChange={(e) => set('requestTimeoutMs', Number(e.target.value))}
            />
          </Field>
          <Field label="最大连接数">
            <input
              required
              type="number"
              min={1}
              max={8}
              value={form.poolMax}
              onChange={(e) => set('poolMax', Number(e.target.value))}
            />
          </Field>
          {connection && (
            <Field label="连接状态">
              <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
                <option value="active">启用</option>
                <option value="disabled">停用</option>
              </select>
            </Field>
          )}
          {!connection && (
            <div className="span-2">
              <div className="section-heading">
                <h3>允许的元数据范围</h3>
                <Button
                  type="button"
                  variant="quiet"
                  onClick={() => set('metadataScope', endpoint?.allowedRelations ?? [])}
                  disabled={!endpoint}
                >
                  选择批准范围
                </Button>
              </div>
              <div className="check-list">
                {endpoint?.allowedRelations.map((r) => (
                  <label key={r.schema + '.' + r.name}>
                    <input
                      type="checkbox"
                      checked={form.metadataScope.some(
                        (s) => s.schema === r.schema && s.name === r.name,
                      )}
                      onChange={(e) =>
                        set(
                          'metadataScope',
                          e.target.checked
                            ? [...form.metadataScope, r]
                            : form.metadataScope.filter(
                                (s) => s.schema !== r.schema || s.name !== r.name,
                              ),
                        )
                      }
                    />
                    <span className="mono">
                      {r.schema}.{r.name}
                    </span>
                  </label>
                ))}
                {!endpoint && <p className="muted">选择端点后，可查看已批准的表与视图。</p>}
              </div>
            </div>
          )}
          {connection && (
            <p className="helper span-2">
              连接目标与凭据别名保持固定。目标变更时需创建新连接，并重新配置环境映射。
            </p>
          )}
        </div>
        <Footer busy={busy} onClose={onClose} label={connection ? '保存更改' : '创建连接'} />
      </form>
    </Dialog>
  );
}
export function SyncDialog({
  connection,
  onClose,
  onSubmit,
}: {
  connection: S['PhysicalConnection'];
  onClose: () => void;
  onSubmit: (relations: S['RelationRef'][]) => Promise<void>;
}) {
  const [selected, setSelected] = useState<S['RelationRef'][]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selected.length) {
      setError('请至少选择一个要同步的表或视图。');
      return;
    }
    setBusy(true);
    try {
      await onSubmit(selected);
      onClose();
    } catch (e) {
      setError(message(e));
      setBusy(false);
    }
  }
  return (
    <Dialog
      title="同步元数据"
      subtitle={connection.name + ' · 仅同步本次明确选择的结构信息。'}
      onClose={onClose}
    >
      <form onSubmit={(e) => void submit(e)}>
        <div className="dialog-body">
          {error && <ErrorBanner error={error} />}
          <div className="section-heading">
            <h3>表与视图范围</h3>
            <Button
              type="button"
              variant="quiet"
              onClick={() => setSelected(connection.metadataScope)}
            >
              全选允许范围
            </Button>
          </div>
          <div className="check-list">
            {connection.metadataScope.map((r) => (
              <label key={r.schema + '.' + r.name}>
                <input
                  type="checkbox"
                  checked={selected.some((s) => s.schema === r.schema && s.name === r.name)}
                  onChange={(e) =>
                    setSelected(
                      e.target.checked
                        ? [...selected, r]
                        : selected.filter((s) => s.schema !== r.schema || s.name !== r.name),
                    )
                  }
                />
                <span className="mono">
                  {r.schema}.{r.name}
                </span>
              </label>
            ))}
          </div>
          <p className="helper">最近一次成功同步的结构会保留；同步失败后可以重试。</p>
        </div>
        <Footer busy={busy} onClose={onClose} label="开始同步" />
      </form>
    </Dialog>
  );
}
export function DatasetDialog({
  api,
  dataset,
  sources,
  onClose,
  onSaved,
}: {
  api: Api;
  dataset: S['Dataset'] | null;
  sources: S['LogicalDataSource'][];
  onClose: () => void;
  onSaved: Saved;
}) {
  const [form, setForm] = useState({
      name: dataset?.name ?? '',
      key: dataset?.key ?? '',
      logicalDataSourceId: dataset?.logicalDataSourceId ?? '',
      description: dataset?.description ?? '',
      status: dataset?.status ?? 'draft',
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (dataset)
        await api.request('/datasets/' + dataset.id, {
          method: 'PATCH',
          revision: dataset.revision,
          body: { name: form.name, description: form.description, status: form.status },
        });
      else
        await api.request('/datasets', {
          method: 'POST',
          body: {
            name: form.name,
            key: form.key,
            logicalDataSourceId: form.logicalDataSourceId,
            description: form.description,
          },
        });
      await onSaved();
      onClose();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title={dataset ? '编辑数据集' : '新建数据集'}
      subtitle="将业务表与视图整理成具有明确含义的数据资源。"
      onClose={onClose}
    >
      <form onSubmit={(e) => void submit(e)}>
        <div className="dialog-body form-grid">
          {error && (
            <div className="span-2">
              <ErrorBanner error={error} />
            </div>
          )}
          <Field label="数据集名称">
            <input
              autoFocus
              required
              maxLength={120}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="唯一编码">
            <input
              required
              pattern="[a-z][a-z0-9_]{1,62}"
              disabled={!!dataset}
              value={form.key}
              onChange={(e) => setForm({ ...form, key: e.target.value })}
              className="mono"
            />
          </Field>
          <Field label="来源数据源" wide>
            <select
              required
              disabled={!!dataset}
              value={form.logicalDataSourceId}
              onChange={(e) => setForm({ ...form, logicalDataSourceId: e.target.value })}
            >
              <option value="">选择业务数据源</option>
              {sources
                .filter((s) => s.status === 'enabled')
                .map((s) => (
                  <option value={s.id} key={s.id}>
                    {s.name} · {s.systemCode}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="业务说明" wide>
            <textarea
              rows={3}
              maxLength={2000}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          {dataset && (
            <Field label="状态">
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as typeof form.status })}
              >
                <option value="draft">草稿</option>
                <option value="enabled">启用</option>
                <option value="disabled">停用</option>
              </select>
            </Field>
          )}
        </div>
        <Footer busy={busy} onClose={onClose} label={dataset ? '保存更改' : '创建数据集'} />
      </form>
    </Dialog>
  );
}
export function GrantDialog({
  api,
  resourceId,
  type,
  members,
  version,
  onClose,
  onSaved,
}: {
  api: Api;
  resourceId: string;
  type: 'dataset' | 'source';
  members: S['OrganizationMember'][];
  version: S['DatasetVersion'] | null;
  onClose: () => void;
  onSaved: Saved;
}) {
  const [user, setUser] = useState(''),
    [action, setAction] = useState(type === 'source' ? 'source.read' : 'dataset.read'),
    [fields, setFields] = useState(version?.fields.map((f) => f.key) ?? []),
    [metrics, setMetrics] = useState(version?.metrics.map((m) => m.key) ?? []),
    [date, setDate] = useState(new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10)),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (type === 'dataset' && !fields.length) throw new Error('请至少选择一个可访问的业务字段。');
      await api.request(
        (type === 'dataset' ? '/datasets/' : '/logical-data-sources/') + resourceId + '/grants',
        {
          method: 'POST',
          body: {
            principalUserId: user,
            action,
            expiresAt: new Date(date + 'T23:59:59Z').toISOString(),
            fieldKeys: fields,
            metricKeys: metrics,
          },
        },
      );
      await onSaved();
      onClose();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title="授予资源访问权限"
      subtitle="权限按用户、资源、动作和有效期生效。"
      onClose={onClose}
    >
      <form onSubmit={(e) => void submit(e)}>
        <div className="dialog-body form-grid">
          {error && (
            <div className="span-2">
              <ErrorBanner error={error} />
            </div>
          )}
          <Field label="授权成员">
            <select required value={user} onChange={(e) => setUser(e.target.value)}>
              <option value="">选择成员</option>
              {members
                .filter((m) => m.status === 'active')
                .map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.displayName ?? m.userId}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="允许的动作">
            <select value={action} onChange={(e) => setAction(e.target.value)}>
              {type === 'source' ? (
                <option value="source.read">浏览逻辑数据源</option>
              ) : (
                <>
                  <option value="dataset.read">浏览数据集结构</option>
                  <option value="dataset.query.test">测试数据预览</option>
                </>
              )}
            </select>
          </Field>
          <Field label="有效期至" wide>
            <input
              required
              type="date"
              value={date}
              min={new Date().toISOString().slice(0, 10)}
              max={new Date(Date.now() + 365 * 86400_000).toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          {type === 'dataset' && version && (
            <>
              <div className="span-2">
                <div className="section-heading">
                  <h3>
                    可见字段{' '}
                    <span>
                      {fields.length}/{version.fields.length}
                    </span>
                  </h3>
                  <Button
                    type="button"
                    variant="quiet"
                    onClick={() => setFields(version.fields.map((f) => f.key))}
                  >
                    全选
                  </Button>
                </div>
                <div className="scope-grid">
                  {version.fields.map((f) => (
                    <label key={f.key}>
                      <input
                        type="checkbox"
                        checked={fields.includes(f.key)}
                        onChange={(e) =>
                          setFields(
                            e.target.checked
                              ? [...fields, f.key]
                              : fields.filter((k) => k !== f.key),
                          )
                        }
                      />
                      {f.name}
                      <code>{f.key}</code>
                    </label>
                  ))}
                </div>
              </div>
              <div className="span-2">
                <div className="section-heading">
                  <h3>可用指标</h3>
                </div>
                {version.metrics.length ? (
                  <div className="scope-grid">
                    {version.metrics.map((m) => (
                      <label key={m.key}>
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
                  </div>
                ) : (
                  <p className="helper">此版本尚未定义指标。</p>
                )}
                <p className="helper">
                  未勾选的字段与指标不在授权范围。测试预览同时需要结构浏览和测试预览两项授权。
                </p>
              </div>
            </>
          )}
        </div>
        <Footer busy={busy} onClose={onClose} label="创建授权" />
      </form>
    </Dialog>
  );
}
