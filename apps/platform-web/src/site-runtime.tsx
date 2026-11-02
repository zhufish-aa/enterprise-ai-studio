import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Api, type S } from './api.js';
import { Button, Dialog, ErrorBanner, Loading } from './components.js';
import './site-runtime.css';
export function SiteDataSources({ api, appId }: { api: Api; appId: string }) {
  const [items, setItems] = useState<S['SiteDataSource'][] | null>(null),
    [error, setError] = useState(''),
    [editing, setEditing] = useState<S['SiteDataSource'] | null | undefined>(undefined),
    [schema, setSchema] = useState<S['SiteSchemaInspection'] | null>(null),
    [checking, setChecking] = useState('');
  const reload = useCallback(async () => {
    const r = await api.request<S['SiteDataSources']>('/apps/' + appId + '/site-data-sources');
    setItems(r.items);
  }, [api, appId]);
  useEffect(() => {
    setItems(null);
    setError('');
    void reload().catch((e) => setError(e.message));
  }, [reload]);
  async function inspect(key: string) {
    setChecking(key);
    setError('');
    try {
      setSchema(
        await api.request('/apps/' + appId + '/site-data-sources/inspect', {
          method: 'POST',
          body: { key },
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : '无法读取数据源。');
    } finally {
      setChecking('');
    }
  }
  return (
    <section className="site-management">
      <header>
        <div>
          <h2>站点数据源</h2>
          <p>此应用的数据库连接，由站点后端使用。</p>
        </div>
        <Button variant="primary" onClick={() => setEditing(null)}>
          添加数据源
        </Button>
      </header>
      {error && <ErrorBanner error={error} />}
      {!items && !error ? (
        <Loading />
      ) : items?.length ? (
        <div className="site-source-list">
          {items.map((item) => (
            <article key={item.key}>
              <div className="site-source-heading">
                <span className="site-source-icon">DB</span>
                <div>
                  <h3>{item.name}</h3>
                  <code>{item.key}</code>
                </div>
                <span className="site-source-tag">
                  {item.mode === 'managed' ? '独立托管数据库' : '外部 PostgreSQL'}
                </span>
              </div>
              <dl>
                <div>
                  <dt>数据库</dt>
                  <dd>{item.database}</dd>
                </div>
                <div>
                  <dt>数据库用户</dt>
                  <dd>{item.username}</dd>
                </div>
                <div>
                  <dt>连接</dt>
                  <dd>
                    {item.host}:{item.port}
                  </dd>
                </div>
                <div>
                  <dt>凭据</dt>
                  <dd>{item.secretConfigured ? '已加密保存' : '未配置'}</dd>
                </div>
              </dl>
              <footer>
                <span>TEST · 仅此站点使用</span>
                <Button disabled={!!checking} onClick={() => void inspect(item.key)}>
                  {checking === item.key ? '正在连接…' : '连接检查与表结构'}
                </Button>
                <Button onClick={() => setEditing(item)}>编辑连接</Button>
              </footer>
            </article>
          ))}
        </div>
      ) : (
        <div className="site-management-empty">
          <h3>尚未配置站点数据源</h3>
          <p>可以创建一个独立数据库，或连接已有的业务数据库。</p>
          <Button onClick={() => setEditing(null)}>添加数据源</Button>
        </div>
      )}
      {editing !== undefined && (
        <SourceEditor
          api={api}
          appId={appId}
          current={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            void reload().catch((e) => setError(e.message));
          }}
        />
      )}
      {schema && (
        <Dialog title={schema.source.name + ' · 表结构'} onClose={() => setSchema(null)}>
          <div className="dialog-body site-schema">
            <p className="site-connection-success">连接成功 · {schema.tables.length} 个字段</p>
            {schema.tables.length ? (
              <table>
                <thead>
                  <tr>
                    <th>表</th>
                    <th>字段</th>
                    <th>类型</th>
                    <th>允许为空</th>
                  </tr>
                </thead>
                <tbody>
                  {schema.tables.map((column, index) => (
                    <tr key={index}>
                      <td>{column.table}</td>
                      <td>{column.column}</td>
                      <td>{column.type}</td>
                      <td>{column.nullable ? '是' : '否'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>数据库尚未创建业务表。站点构建后，数据库迁移文件会随后端部署执行。</p>
            )}
          </div>
          <footer className="dialog-footer">
            <Button onClick={() => setSchema(null)}>关闭</Button>
          </footer>
        </Dialog>
      )}
    </section>
  );
}
function SourceEditor({
  api,
  appId,
  current,
  onClose,
  onSaved,
}: {
  api: Api;
  appId: string;
  current: S['SiteDataSource'] | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [key, setKey] = useState(current?.key ?? 'main'),
    [name, setName] = useState(current?.name ?? '业务数据库'),
    [mode, setMode] = useState<'managed' | 'external'>(current?.mode ?? 'managed'),
    [host, setHost] = useState(current?.mode === 'external' ? current.host : ''),
    [port, setPort] = useState(current?.port ?? 5432),
    [database, setDatabase] = useState(current?.mode === 'external' ? current.database : ''),
    [username, setUsername] = useState(current?.mode === 'external' ? current.username : ''),
    [password, setPassword] = useState(''),
    [tls, setTls] = useState(current?.tls ?? true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.request('/apps/' + appId + '/site-data-sources', {
        method: 'POST',
        body: {
          key,
          name,
          mode,
          revision: current?.revision ?? 0,
          ...(mode === 'external'
            ? { host, port, database, username, tls, ...(password ? { password } : {}) }
            : {}),
        },
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : '数据源保存失败。');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title={current ? '编辑站点数据源' : '添加站点数据源'}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form onSubmit={(e) => void save(e)}>
        <div className="dialog-body site-source-form">
          {error && <ErrorBanner error={error} />}
          <label>
            数据源名称
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            代码中的连接名
            <input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              disabled={!!current}
              pattern="[a-z][a-z0-9_]{0,62}"
              required
            />
            <small>后端通过此名称选择连接，例如 main。</small>
          </label>
          <label>
            连接方式
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as 'managed' | 'external')}
              disabled={!!current}
            >
              <option value="managed">创建独立托管数据库</option>
              <option value="external">连接外部 PostgreSQL</option>
            </select>
          </label>
          {mode === 'managed' ? (
            <p>平台创建此站点专用的数据库和数据库账号，业务表由项目中的 db/ 迁移文件维护。</p>
          ) : (
            <>
              <div className="form-grid">
                <label>
                  主机
                  <input required value={host} onChange={(e) => setHost(e.target.value)} />
                </label>
                <label>
                  端口
                  <input
                    required
                    type="number"
                    min={1}
                    max={65535}
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value))}
                  />
                </label>
              </div>
              <label>
                数据库
                <input required value={database} onChange={(e) => setDatabase(e.target.value)} />
              </label>
              <label>
                数据库账号
                <input required value={username} onChange={(e) => setUsername(e.target.value)} />
              </label>
              <label>
                密码
                <input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={!current}
                  placeholder={current ? '留空保留原密码' : ''}
                />
                <small>加密保存，不返回源码、插件或 AI。</small>
              </label>
              <label className="site-tls">
                <input type="checkbox" checked={tls} onChange={(e) => setTls(e.target.checked)} />
                验证数据库 TLS 证书
              </label>
            </>
          )}
        </div>
        <footer className="dialog-footer">
          <Button disabled={busy} onClick={onClose}>
            取消
          </Button>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? '正在保存并检查连接…' : '保存并检查连接'}
          </Button>
        </footer>
      </form>
    </Dialog>
  );
}
export function SiteBackendRuntime({
  api,
  appId,
  versionId,
  onActivated,
}: {
  api: Api;
  appId: string;
  versionId: string;
  onActivated: () => void;
}) {
  const [overview, setOverview] = useState<S['SiteRuntimeOverview'] | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('');
  const reload = useCallback(
    async () => setOverview(await api.request('/apps/' + appId + '/site-runtime')),
    [api, appId],
  );
  useEffect(() => {
    void reload().catch((e) => setError(e.message));
  }, [reload]);
  async function deploy(activate: boolean) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (activate) {
        const share = await api.request<S['SiteSharing']>('/apps/' + appId + '/sharing');
        await api.request('/apps/' + appId + '/site-runtime/activate', {
          method: 'POST',
          body: { versionId, expectedRevision: share.revision },
        });
        setNotice('原分享链接已更新到此版本。');
        onActivated();
      } else {
        const result = await api.request<S['SiteRuntimeStatus']>(
          '/apps/' + appId + '/site-runtime/deploy',
          { method: 'POST', body: { versionId } },
        );
        if (result.status !== 'ready') throw new Error(result.logs.join('\n'));
        setNotice('此版本后端已启动。');
      }
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : '后端部署失败。');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="site-management">
      <header>
        <div>
          <h2>后端运行</h2>
          <p>后端随站点版本构建，使用此站点的数据源。</p>
        </div>
        <div className="site-runtime-actions">
          <Button
            disabled={busy || !versionId || !overview?.enabled}
            onClick={() => void deploy(false)}
          >
            {busy ? '正在处理…' : '部署所选版本后端'}
          </Button>
          <Button
            variant="primary"
            disabled={busy || !versionId || !overview?.enabled}
            onClick={() => void deploy(true)}
          >
            更新原分享链接
          </Button>
        </div>
      </header>
      {error && <ErrorBanner error={error} />}
      {notice && (
        <p className="site-connection-success" role="status">
          {notice}
        </p>
      )}
      {!overview && !error ? (
        <Loading />
      ) : !overview?.enabled ? (
        <p>站点后端运行服务尚未配置。</p>
      ) : overview.items.length ? (
        <div className="site-backend-list">
          {overview.items.map((item) => (
            <article key={item.versionId}>
              <header>
                <strong>
                  {item.status === 'ready'
                    ? '运行中'
                    : item.status === 'failed'
                      ? '启动失败'
                      : '已停止'}
                </strong>
                <code>{item.versionId}</code>
                <span>{new Date(item.updatedAt).toLocaleString()}</span>
              </header>
              <small>
                构建：{item.buildId} · 后端摘要：{item.backendDigest.slice(0, 16)}
              </small>
              <pre>{item.logs.join('\n')}</pre>
            </article>
          ))}
        </div>
      ) : (
        <div className="site-management-empty">
          <h3>还没有部署站点后端</h3>
          <p>在源码中添加 server/ 后端和 db/ 迁移，并在清单中配置 runtime；构建后可在这里部署。</p>
        </div>
      )}
    </section>
  );
}
