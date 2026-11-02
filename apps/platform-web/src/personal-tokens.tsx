import { useCallback, useEffect, useRef, useState } from 'react';
import { Api, type S } from './api.js';
import { Button, Dialog, ErrorBanner, Loading, formatDate } from './components.js';
import { Icon } from './icons.js';
import './sharing.css';
export function PersonalTokens({
  api,
  human,
  onClose,
}: {
  api: Api;
  human: boolean;
  onClose: () => void;
}) {
  const [items, setItems] = useState<S['PersonalToken'][]>([]),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [name, setName] = useState('Harness 工作台'),
    [scope, setScope] = useState<'read' | 'develop'>('develop'),
    [days, setDays] = useState(30),
    [error, setError] = useState(''),
    [secret, setSecret] = useState(''),
    [copied, setCopied] = useState(false),
    [revoking, setRevoking] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null),
    [manual, setManual] = useState(false),
    [creating, setCreating] = useState(false);
  const reload = useCallback(async () => {
    const page = await api.request<S['PersonalTokenPage']>('/me/tokens');
    setItems(page.items);
  }, [api]);
  useEffect(() => {
    if (!human) {
      setLoading(false);
      return;
    }
    void reload()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [reload, human]);
  async function create() {
    setBusy(true);
    setError('');
    try {
      const value = await api.request<S['CreatedPersonalToken']>('/me/tokens', {
        method: 'POST',
        body: { name: name.trim(), scope, expiresInDays: days },
      });
      setSecret(value.token);
      setCopied(false);
      setManual(false);
      setCreating(false);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : '创建失败。');
    } finally {
      setBusy(false);
    }
  }
  async function revoke(id: string) {
    setBusy(true);
    setError('');
    try {
      await api.request('/me/tokens/' + id + '/revoke', { method: 'POST' });
      setRevoking(null);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : '撤销失败。');
    } finally {
      setBusy(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
    } catch {
      input.current?.focus();
      input.current?.select();
      setManual(true);
    }
  }
  return (
    <Dialog
      title="个人访问令牌"
      subtitle="为 Harness 等客户端创建独立凭证，随时撤销。"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <div className="dialog-body personal-tokens">
        {error && <ErrorBanner error={error} />}
        {!human ? (
          <div className="token-info">
            <Icon name="lock" size={20} />
            <p>请使用交互式企业身份登录后创建或管理令牌。个人令牌和 AI 会话不能再次签发令牌。</p>
          </div>
        ) : (
          <>
            {secret ? (
              <section className="token-secret">
                <div className="token-section-heading">
                  <Icon name="check" size={18} />
                  <strong>令牌已创建</strong>
                </div>
                <p>
                  完整令牌仅展示这一次。请立即保存到密码管理器，或粘贴到 Harness 的服务器设置中。
                </p>
                <label>
                  新令牌
                  <input
                    ref={input}
                    value={secret}
                    readOnly
                    autoComplete="off"
                    aria-label="新创建的个人访问令牌"
                  />
                </label>
                <Button onClick={() => void copy()}>{copied ? '已复制' : '复制令牌'}</Button>
                {manual && <p role="status">令牌已选中，请按 Ctrl+C 复制。</p>}
                <button
                  className="token-text-button"
                  onClick={() => {
                    setSecret('');
                    setCopied(false);
                  }}
                >
                  我已保存，隐藏令牌
                </button>
              </section>
            ) : creating ? (
              <form
                className="token-create"
                onSubmit={(e) => {
                  e.preventDefault();
                  void create();
                }}
              >
                <label>
                  令牌名称
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={80}
                    placeholder="例如 办公电脑 Harness"
                  />
                </label>
                <div className="token-form-grid">
                  <label>
                    权限范围
                    <select
                      value={scope}
                      onChange={(e) => setScope(e.target.value as 'read' | 'develop')}
                    >
                      <option value="develop">开发 · 目录、源码、TEST 查询与构建</option>
                      <option value="read">只读 · 目录与应用元信息</option>
                    </select>
                  </label>
                  <label>
                    有效期
                    <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
                      {[7, 30, 90].map((d) => (
                        <option value={d} key={d}>
                          {d} 天
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <p className="token-muted">
                  访问范围取决于本人当前授权。令牌不能管理凭据、审批或生产数据，也不能创建其他令牌。
                </p>
                <div className="token-create-actions">
                  <Button disabled={busy} onClick={() => setCreating(false)}>
                    取消
                  </Button>
                  <Button type="submit" variant="primary" disabled={busy || !name.trim()}>
                    {busy ? '正在创建…' : '创建令牌'}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="token-list-heading">
                <span>当前组织 · 最新 100 个</span>
                <Button icon="plus" onClick={() => setCreating(true)}>
                  创建令牌
                </Button>
              </div>
            )}
            {loading ? (
              <Loading />
            ) : (
              <div className="token-list">
                {items.length === 0 ? (
                  <p className="token-muted">
                    暂无个人访问令牌。为每台设备创建独立令牌，便于管理和撤销。
                  </p>
                ) : (
                  items.map((item) => {
                    const expired = Date.parse(item.expiresAt) <= Date.now(),
                      active = !item.revokedAt && !expired;
                    return (
                      <article key={item.id}>
                        <span className="token-mark">
                          <Icon name="lock" size={17} />
                        </span>
                        <div>
                          <strong>{item.name}</strong>
                          <p>
                            <code>{item.hint}</code> · {item.scope === 'develop' ? '开发' : '只读'}{' '}
                            · {item.revokedAt ? '已撤销' : expired ? '已过期' : '有效'}
                          </p>
                          <small>
                            创建于 {formatDate(item.createdAt)} · 到期 {formatDate(item.expiresAt)}
                          </small>
                          {revoking === item.id && (
                            <div className="token-revoke">
                              <span>撤销后，使用此令牌的客户端和查询将失效。</span>
                              <Button disabled={busy} onClick={() => setRevoking(null)}>
                                取消
                              </Button>
                              <Button disabled={busy} onClick={() => void revoke(item.id)}>
                                确认撤销
                              </Button>
                            </div>
                          )}
                        </div>
                        {active && revoking !== item.id && (
                          <Button disabled={busy} onClick={() => setRevoking(item.id)}>
                            撤销
                          </Button>
                        )}
                      </article>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}
      </div>
      <footer className="dialog-footer">
        <span className="token-muted">令牌不会写入浏览器存储</span>
        <Button disabled={busy} onClick={onClose}>
          完成
        </Button>
      </footer>
    </Dialog>
  );
}
