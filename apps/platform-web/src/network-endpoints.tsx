import { useState, type FormEvent } from 'react';
import { Api, type S } from './api.js';
import { Button, Dialog, Field, ErrorBanner, Environment } from './components.js';
const engines = { postgresql: 'PostgreSQL', mysql: 'MySQL', sqlserver: 'SQL Server' };
export function EndpointDialog({
  api,
  environment,
  engine,
  profiles,
  onClose,
  onCreated,
}: {
  api: Api;
  environment: 'test' | 'production';
  engine: keyof typeof engines;
  profiles: S['CredentialProfile'][];
  onClose: () => void;
  onCreated: (value: S['CreatedNetworkEndpoint']) => Promise<void> | void;
}) {
  const [name, setName] = useState(''),
    [host, setHost] = useState(''),
    [port, setPort] = useState(engine === 'mysql' ? 3306 : engine === 'sqlserver' ? 1433 : 5432),
    [addresses, setAddresses] = useState(''),
    [tls, setTls] = useState(''),
    [databases, setDatabases] = useState(''),
    [relations, setRelations] = useState(''),
    [caRef, setCaRef] = useState(''),
    [credential, setCredential] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const split = (text: string) =>
      text
        .split(/[\r\n,，;；]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host.trim());
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const objects = split(relations).map((value) => {
        const pieces = value.split('.');
        if (pieces.length !== 2 || !pieces[0]?.trim() || !pieces[1]?.trim())
          throw new Error('表或视图请按 schema.table 填写，每行一个。');
        return { schema: pieces[0].trim(), name: pieces[1].trim() };
      });
      const result = await api.request<S['CreatedNetworkEndpoint']>('/network-endpoints', {
        method: 'POST',
        body: {
          name: name.trim(),
          environment,
          engine,
          host: host.trim(),
          port,
          allowedAddresses: isIp ? [host.trim()] : split(addresses),
          tlsServerName: tls.trim() || host.trim(),
          allowedDatabases: split(databases),
          allowedRelations: objects,
          ...(caRef.trim() ? { caRef: caRef.trim() } : {}),
          ...(credential ? { credentialProfileId: credential } : {}),
        },
      });
      await onCreated(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : '端点未能添加。');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title="新增网络端点"
      subtitle="由平台管理员登记数据库地址和访问范围，保存后即可在物理连接中选择。"
      onClose={onClose}
    >
      <form onSubmit={(e) => void submit(e)}>
        <div className="dialog-body form-grid">
          {error && (
            <div className="span-2">
              <ErrorBanner error={error} />
            </div>
          )}
          <div className="endpoint-note span-2">
            <Environment value={environment} />
            <span>{engines[engine]}</span>
            <small>仅登记配置，不立即连接数据库；测试与生产分别管理。</small>
          </div>
          <Field label="端点名称" wide>
            <input
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              placeholder="例如 ERP 销售测试数据库"
            />
          </Field>
          <Field label="数据库服务器 IP 或域名">
            <input
              required
              value={host}
              onChange={(e) => setHost(e.target.value)}
              maxLength={253}
              placeholder="10.10.20.15 或 db.internal"
            />
          </Field>
          <Field label="端口">
            <input
              type="number"
              required
              min={1}
              max={65535}
              value={port}
              onChange={(e) => setPort(Number(e.target.value))}
            />
          </Field>
          {!isIp && (
            <Field
              label="域名允许解析到的 IPv4 地址"
              hint="每行一个地址。连接时仍会核对 DNS 结果，防止地址指向未批准目标。"
              wide
            >
              <textarea
                required
                value={addresses}
                onChange={(e) => setAddresses(e.target.value)}
                rows={2}
                placeholder="10.10.20.15"
              />
            </Field>
          )}
          <Field label="TLS 证书服务器名称" hint="使用证书中的名称；留空使用服务器地址。">
            <input
              value={tls}
              onChange={(e) => setTls(e.target.value)}
              placeholder={host || 'db.internal'}
            />
          </Field>
          <Field label="私有 CA 引用（可选）" hint="仅填写秘密管理中的证书引用，不上传私钥或密码。">
            <input
              value={caRef}
              onChange={(e) => setCaRef(e.target.value)}
              placeholder="secret/data/certificates/company-ca"
            />
          </Field>
          <Field label="允许访问的数据库" hint="每行一个，物理连接的数据库选项来自这里。" wide>
            <textarea
              required
              value={databases}
              onChange={(e) => setDatabases(e.target.value)}
              rows={2}
              placeholder="erp_test"
            />
          </Field>
          <Field
            label="允许同步的表或视图"
            hint="每行一个 schema.table。不会扫描未列出的对象。"
            wide
          >
            <textarea
              required
              value={relations}
              onChange={(e) => setRelations(e.target.value)}
              rows={3}
              placeholder={'sales.orders\nsales.customers'}
            />
          </Field>
          <Field
            label="复用只读凭据（可选）"
            hint="显式为新端点建立独立凭据别名，原绑定保持不变。新账号的密码由企业秘密管理保存，平台不读取或展示。"
            wide
          >
            <select value={credential} onChange={(e) => setCredential(e.target.value)}>
              <option value="">稍后由凭据管理员登记</option>
              {profiles
                .filter((p) => p.environment === environment && p.engine === engine)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
            </select>
          </Field>
          <p className="helper span-2">
            此处批准的是数据库连接地址，不会授予生产业务查询或发布权限。新端点强制校验 TLS；本机无
            TLS 的测试实例由运维单独登记。
          </p>
        </div>
        <footer className="dialog-footer">
          <Button type="button" disabled={busy} onClick={onClose}>
            取消
          </Button>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? '正在添加…' : '添加端点'}
          </Button>
        </footer>
      </form>
    </Dialog>
  );
}
export function EndpointManager({
  api,
  endpoints,
  profiles,
  canManage,
  onClose,
  onChanged,
}: {
  api: Api;
  endpoints: S['NetworkEndpoint'][];
  profiles: S['CredentialProfile'][];
  canManage: boolean;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [create, setCreate] = useState(false),
    [environment, setEnvironment] = useState<'test' | 'production'>('test'),
    [engine, setEngine] = useState<keyof typeof engines>('postgresql');
  if (create)
    return (
      <EndpointDialog
        api={api}
        environment={environment}
        engine={engine}
        profiles={profiles}
        onClose={() => setCreate(false)}
        onCreated={async () => {
          await onChanged();
          setCreate(false);
        }}
      />
    );
  return (
    <Dialog
      wide
      title="网络端点"
      subtitle="物理连接的地址、数据库及可同步对象来自这里。端点创建后保持固定，目标变更时新增端点。"
      onClose={onClose}
    >
      <div className="dialog-body">
        <div className="endpoint-manager-toolbar">
          <select
            aria-label="新增端点的环境"
            value={environment}
            onChange={(e) => setEnvironment(e.target.value as typeof environment)}
          >
            <option value="test">TEST 测试</option>
            <option value="production">PROD 生产</option>
          </select>
          <select
            aria-label="新增端点的数据库类型"
            value={engine}
            onChange={(e) => setEngine(e.target.value as typeof engine)}
          >
            {Object.entries(engines).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          {canManage && (
            <Button variant="primary" icon="plus" onClick={() => setCreate(true)}>
              新增网络端点
            </Button>
          )}
        </div>
        {!canManage && (
          <p className="helper">当前身份可选择端点；添加端点需要管理员的 network.manage 权限。</p>
        )}
        {endpoints.map((endpoint) => (
          <article className="endpoint-manager-item" key={endpoint.id}>
            <header>
              <strong>{endpoint.name}</strong>
              <Environment value={endpoint.environment} />
            </header>
            <code>
              {endpoint.host}:{endpoint.port}
            </code>
            <p>
              {engines[endpoint.engine]} · {endpoint.allowedDatabases.join('、')}
            </p>
            <small>
              允许对象：{endpoint.allowedRelations.map((r) => r.schema + '.' + r.name).join('、')}
            </small>
          </article>
        ))}
        {!endpoints.length && <p>尚无网络端点。先添加端点，再创建物理连接。</p>}
      </div>
      <footer className="dialog-footer">
        <Button onClick={onClose}>完成</Button>
      </footer>
    </Dialog>
  );
}
