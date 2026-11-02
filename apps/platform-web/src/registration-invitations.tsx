import { RegistrationPolicy } from './registration-policy.js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Api, type S } from './api.js';
import { Button, Dialog, ErrorBanner, Loading, formatDate } from './components.js';
export function RegistrationInvitations({ api, onClose }: { api: Api; onClose: () => void }) {
  const [items, setItems] = useState<S['RegistrationInvitation'][]>([]),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [label, setLabel] = useState('新同事'),
    [role, setRole] = useState<'developer' | 'viewer'>('developer'),
    [days, setDays] = useState(7),
    [code, setCode] = useState(''),
    [copied, setCopied] = useState(false),
    [error, setError] = useState(''),
    input = useRef<HTMLInputElement>(null);
  const load = useCallback(async () => {
    const page = await api.request<S['RegistrationInvitationPage']>('/registration-invitations');
    setItems(page.items);
  }, [api]);
  useEffect(() => {
    void load()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [load]);
  async function create() {
    setBusy(true);
    setError('');
    try {
      const value = await api.request<S['CreatedRegistrationInvitation']>(
        '/registration-invitations',
        { method: 'POST', body: { label: label.trim(), role, expiresInDays: days } },
      );
      setCode(value.code);
      setCopied(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '创建失败。');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title="注册设置"
      subtitle="管理当前组织的注册方式和邀请码。"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <div className="dialog-body personal-tokens">
        <RegistrationPolicy api={api} />
        <h3 className="registration-invitations-heading">邀请码管理</h3>
        {error && <ErrorBanner error={error} />}
        {code ? (
          <section className="token-secret">
            <strong>邀请码已创建</strong>
            <p>将邀请码交给同事，让对方在登录页点击“注册账号”。</p>
            <input ref={input} readOnly aria-label="新创建的邀请码" value={code} />
            <Button
              onClick={() => {
                void navigator.clipboard
                  .writeText(code)
                  .then(() => setCopied(true))
                  .catch(() => {
                    input.current?.focus();
                    input.current?.select();
                    setError('邀请码已选中，请按 Ctrl+C 复制。');
                  });
              }}
            >
              {copied ? '已复制' : '复制邀请码'}
            </Button>
            <button className="token-text-button" onClick={() => setCode('')}>
              我已保存，隐藏邀请码
            </button>
          </section>
        ) : (
          <form
            className="token-create"
            onSubmit={(e) => {
              e.preventDefault();
              void create();
            }}
          >
            <label>
              备注
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                required
                maxLength={80}
                placeholder="例如 财务部新同事"
              />
            </label>
            <div className="token-form-grid">
              <label>
                初始权限
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'developer' | 'viewer')}
                >
                  <option value="developer">业务开发成员</option>
                  <option value="viewer">业务只读成员</option>
                </select>
              </label>
              <label>
                有效期
                <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
                  <option value={1}>1 天</option>
                  <option value={7}>7 天</option>
                </select>
              </label>
            </div>
            <div className="token-create-actions">
              <Button type="submit" variant="primary" disabled={busy || !label.trim()}>
                {busy ? '正在创建…' : '创建邀请码'}
              </Button>
            </div>
          </form>
        )}
        {loading ? (
          <Loading />
        ) : (
          <div className="token-list">
            {items.map((item) => (
              <article key={item.id}>
                <div>
                  <strong>{item.label}</strong>
                  <p>
                    {item.role === 'developer' ? '业务开发' : '只读'} ·{' '}
                    {item.usedAt
                      ? '已使用'
                      : item.revokedAt
                        ? '已撤销'
                        : Date.parse(item.expiresAt) < Date.now()
                          ? '已过期'
                          : '等待注册'}
                  </p>
                  <small>
                    {formatDate(item.createdAt)} 创建 · {formatDate(item.expiresAt)} 到期
                  </small>
                </div>
                {!item.revokedAt && !item.usedAt && Date.parse(item.expiresAt) > Date.now() && (
                  <Button
                    disabled={busy}
                    onClick={() => {
                      setBusy(true);
                      void api
                        .request('/registration-invitations/' + item.id + '/revoke', {
                          method: 'POST',
                        })
                        .then(load)
                        .catch((e) => setError(e.message))
                        .finally(() => setBusy(false));
                    }}
                  >
                    撤销
                  </Button>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
      <footer className="dialog-footer">
        <Button onClick={onClose} disabled={busy}>
          完成
        </Button>
      </footer>
    </Dialog>
  );
}
