import { useCallback, useEffect, useState } from 'react';
import { Api, type S } from './api.js';
import { ErrorBanner } from './components.js';
import './registration-settings.css';

export function RegistrationPolicy({ api }: { api: Api }) {
  const [value, setValue] = useState<S['RegistrationSettings'] | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [saved, setSaved] = useState(false);
  const load = useCallback(
    async (signal?: AbortSignal) =>
      setValue(
        await api.request<S['RegistrationSettings']>(
          '/registration-settings',
          signal ? { signal } : {},
        ),
      ),
    [api],
  );
  useEffect(() => {
    const abort = new AbortController();
    void load(abort.signal).catch((e) => {
      if (!abort.signal.aborted) setError(e.message);
    });
    return () => abort.abort();
  }, [load]);
  async function change() {
    if (!value) return;
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      setValue(
        await api.request<S['RegistrationSettings']>('/registration-settings', {
          method: 'POST',
          body: { invitationRequired: !value.invitationRequired, expectedRevision: value.revision },
        }),
      );
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : '注册设置保存失败。');
      await load().catch(() => {});
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="registration-policy" aria-labelledby="registration-policy-title">
      <header>
        <h3 id="registration-policy-title">注册方式</h3>
        <span role="status">{busy ? '正在保存…' : saved ? '已保存' : ''}</span>
      </header>
      {error && <ErrorBanner error={error} />}
      {value ? (
        <>
          <div className="registration-policy-row">
            <div>
              <strong id="registration-policy-label">注册需要邀请码</strong>
              <p>
                {value.invitationRequired
                  ? '用户需要填写有效邀请码才能注册。'
                  : '用户可直接注册为业务开发成员。'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={value.invitationRequired}
              aria-labelledby="registration-policy-label"
              aria-busy={busy}
              disabled={busy}
              className="registration-policy-switch"
              onClick={() => void change()}
            >
              <span />
            </button>
          </div>
          <p className="registration-policy-note">
            {value.invitationRequired
              ? '关闭后，注册页将不再要求填写邀请码。'
              : '新账号不会自动获得数据集或管理员权限。'}
          </p>
        </>
      ) : (
        !error && (
          <p className="registration-policy-loading" role="status">
            正在读取注册设置…
          </p>
        )
      )}
    </section>
  );
}
