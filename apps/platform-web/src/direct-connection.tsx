import { useState, type FormEvent } from 'react';
import { Api, type S } from './api.js';
import { Button, Dialog, Field, ErrorBanner, Status } from './components.js';
export function DirectConnectionDialog({
  api,
  environment = 'test',
  engine = 'postgresql',
  onClose,
  onSaved,
  onExisting,
}: {
  api: Api;
  environment?: 'test' | 'production';
  engine?: S['PhysicalConnection']['engine'];
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  onExisting: () => void;
}) {
  const [form, setForm] = useState<S['ConfigurePhysicalConnection']>({
      name: '',
      environment,
      engine,
      host: '',
      port: engine === 'mysql' ? 3306 : engine === 'sqlserver' ? 1433 : 5432,
      databaseName: '',
      username: '',
      password: '',
      tlsMode: 'verify-full',
      metadataScope: [],
      connectTimeoutMs: 5000,
      requestTimeoutMs: 10000,
      poolMax: 2,
    }),
    [scope, setScope] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [connection, setConnection] = useState<S['PhysicalConnection'] | null>(null),
    [health, setHealth] = useState(''),
    [advanced, setAdvanced] = useState(false);
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    const next = { ...form, [key]: value };
    if (key === 'host' || key === 'environment')
      next.tlsMode =
        next.environment === 'test' && ['127.0.0.1', 'localhost'].includes(next.host)
          ? 'disable-local-test'
          : 'verify-full';
    setForm(next);
    setConnection(null);
    setHealth('');
  };
  async function ensureSaved() {
    if (connection) return connection;
    const metadataScope = scope
      .split(/[\r\n,，]+/)
      .map((v) => v.trim())
      .filter(Boolean)
      .map((value) => {
        const [schema, name, ...rest] = value.split('.');
        if (!schema || !name || rest.length)
          throw new Error('同步对象请按 schema.table 填写，每行一个。');
        return { schema, name };
      });
    const saved = await api.request<S['PhysicalConnection']>('/physical-connections/configure', {
      method: 'POST',
      body: {
        ...form,
        metadataScope,
        ...(!form.tlsServerName
          ? { tlsServerName: form.host.trim() === 'localhost' ? '127.0.0.1' : form.host.trim() }
          : {}),
      },
    });
    setConnection(saved);
    return saved;
  }
  async function submit(e: FormEvent, test: boolean) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const saved = await ensureSaved();
      await onSaved();
      if (!test) {
        onClose();
        return;
      }
      setHealth('running');
      let job = await api.request<S['CatalogJob']>('/physical-connections/' + saved.id + '/tests', {
        method: 'POST',
      });
      for (let i = 0; i < 120 && !['succeeded', 'failed'].includes(job.status); i++) {
        await new Promise((r) => setTimeout(r, 250));
        job = await api.request('/catalog-jobs/' + job.id);
      }
      setHealth(job.status === 'succeeded' ? 'healthy' : 'unhealthy');
      await onSaved();
      if (job.status !== 'succeeded')
        throw new Error(
          job.failureCode === 'NETWORK_ADDRESS_FORBIDDEN'
            ? '地址未通过连接服务的网络检查。'
            : job.failureCode === 'CREDENTIAL_UNAVAILABLE'
              ? '连接服务尚未接通加密凭据存储。'
              : '连接检查失败，请核对地址、端口、账号、TLS 和数据库权限。',
        );
    } catch (e) {
      setError(e instanceof Error ? e.message : '连接未能保存。');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title="新建物理连接"
      subtitle="填写数据库连接信息。账号密码加密保存，AI 和业务用户无法读取。"
      onClose={onClose}
    >
      <form autoComplete="off" onSubmit={(e) => void submit(e, false)}>
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
              maxLength={100}
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="例如 ERP 销售测试库"
              disabled={busy}
            />
          </Field>
          <Field label="数据库类型">
            <select
              value={form.engine}
              disabled={busy}
              onChange={(e) => {
                const engine = e.target.value as typeof form.engine;
                setForm({
                  ...form,
                  engine,
                  port: engine === 'mysql' ? 3306 : engine === 'sqlserver' ? 1433 : 5432,
                });
                setConnection(null);
                setHealth('');
              }}
            >
              <option value="postgresql">PostgreSQL</option>
              <option value="mysql">MySQL</option>
              <option value="sqlserver">SQL Server</option>
            </select>
          </Field>
          <Field label="环境">
            <select
              value={form.environment}
              onChange={(e) => set('environment', e.target.value as typeof form.environment)}
              disabled={busy}
            >
              <option value="test">TEST · 测试环境</option>
              <option value="production">PROD · 生产环境</option>
            </select>
          </Field>
          <Field label="主机地址">
            <input
              required
              value={form.host}
              onChange={(e) => set('host', e.target.value.trim())}
              placeholder="10.10.20.15 或 db.internal"
              maxLength={253}
              disabled={busy}
            />
          </Field>
          <Field label="端口">
            <input
              required
              type="number"
              min={1}
              max={65535}
              value={form.port}
              onChange={(e) => set('port', Number(e.target.value))}
              disabled={busy}
            />
          </Field>
          <Field label="数据库名称" wide>
            <input
              required
              value={form.databaseName}
              onChange={(e) => set('databaseName', e.target.value)}
              placeholder="erp_test"
              maxLength={128}
              disabled={busy}
            />
          </Field>
          <Field label="用户名">
            <input
              required
              value={form.username}
              onChange={(e) => set('username', e.target.value)}
              placeholder="数据库只读账号"
              maxLength={128}
              disabled={busy}
              autoComplete="off"
            />
          </Field>
          <Field label="密码">
            <input
              required
              type="password"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              maxLength={8192}
              disabled={busy}
              autoComplete="new-password"
            />
          </Field>
          <div className="span-2">
            <Button type="button" variant="quiet" onClick={() => setAdvanced((v) => !v)}>
              {advanced ? '收起高级设置' : '高级设置 · TLS、超时与结构同步'}
            </Button>
          </div>
          {advanced && (
            <>
              <Field label="TLS / SSL">
                <select
                  value={form.tlsMode}
                  onChange={(e) => set('tlsMode', e.target.value as typeof form.tlsMode)}
                  disabled={busy}
                >
                  <option value="verify-full">启用并校验证书</option>
                  {form.environment === 'test' &&
                    ['127.0.0.1', 'localhost'].includes(form.host) && (
                      <option value="disable-local-test">本机 TEST · 不使用 TLS</option>
                    )}
                </select>
              </Field>
              <Field label="证书服务器名">
                <input
                  value={form.tlsServerName ?? ''}
                  placeholder={form.host || '留空使用主机地址'}
                  onChange={(e) => set('tlsServerName', e.target.value)}
                  disabled={busy}
                />
              </Field>
              <Field label="私有 CA 引用（可选）" wide>
                <input
                  value={form.caRef ?? ''}
                  onChange={(e) => {
                    const next = { ...form };
                    if (e.target.value) next.caRef = e.target.value;
                    else delete next.caRef;
                    setForm(next);
                    setConnection(null);
                    setHealth('');
                  }}
                  placeholder="secret/data/certificates/company-ca"
                  disabled={busy}
                />
              </Field>
              <Field label="连接超时（毫秒）">
                <input
                  type="number"
                  min={100}
                  max={10000}
                  required
                  value={form.connectTimeoutMs}
                  onChange={(e) => set('connectTimeoutMs', Number(e.target.value))}
                  disabled={busy}
                />
              </Field>
              <Field label="查询超时（毫秒）">
                <input
                  type="number"
                  min={100}
                  max={30000}
                  required
                  value={form.requestTimeoutMs}
                  onChange={(e) => set('requestTimeoutMs', Number(e.target.value))}
                  disabled={busy}
                />
              </Field>
              <Field label="连接池上限">
                <input
                  type="number"
                  min={1}
                  max={8}
                  required
                  value={form.poolMax}
                  onChange={(e) => set('poolMax', Number(e.target.value))}
                  disabled={busy}
                />
              </Field>
              <Field
                label="允许同步的表或视图（可选）"
                hint="每行 schema.table；可先留空保存并测试连接。后台不会默认扫描全部库表。"
                wide
              >
                <textarea
                  rows={3}
                  value={scope}
                  onChange={(e) => {
                    setScope(e.target.value);
                    setConnection(null);
                    setHealth('');
                  }}
                  placeholder={'sales.orders\nsales.customers'}
                  disabled={busy}
                />
              </Field>
            </>
          )}
          {health && (
            <div className="span-2">
              <Status
                value={health}
                label={
                  health === 'healthy'
                    ? '连接成功'
                    : health === 'running'
                      ? '正在连接数据库…'
                      : '连接未通过'
                }
              />
            </div>
          )}
          <p className="helper span-2">
            测试连接会先保存配置，再由对应环境的连接服务检查。生产检查仍需要独立权限。
          </p>
          <Button type="button" variant="quiet" onClick={onExisting} disabled={busy}>
            使用已登记的端点和凭据
          </Button>
        </div>
        <footer className="dialog-footer">
          <Button type="button" disabled={busy} onClick={onClose}>
            取消
          </Button>
          <Button
            type="button"
            disabled={busy}
            onClick={(e) => {
              const f = e.currentTarget.form;
              if (f?.reportValidity()) void submit(e, true);
            }}
          >
            {busy ? '正在处理…' : '测试连接'}
          </Button>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? '正在保存…' : '保存连接'}
          </Button>
        </footer>
      </form>
    </Dialog>
  );
}
