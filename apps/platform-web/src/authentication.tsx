import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Api, ApiError, type S } from './api.js';
import { Button, ErrorBanner, Loading } from './components.js';
import { Icon, Mark } from './icons.js';
import { AuthenticationArt } from './authentication-art.js';
import './authentication.css';
export interface WebSession {
  token: string;
  csrfToken: string;
  me: S['CurrentUser'];
  mustChangePassword: boolean;
}
function accountError(error: unknown, credentialsMessage = '账号或密码错误，请重新输入。'): string {
  if (error instanceof ApiError)
    return error.code === 'INVALID_CREDENTIALS' ? credentialsMessage : error.diagnostic.message;
  if (error instanceof TypeError) return '无法连接服务器，请检查网络后重试。';
  return error instanceof Error ? error.message : '操作未完成，请重试。';
}
export async function hydrateSession(auth: S['BrowserSession']): Promise<WebSession> {
  if (auth.mustChangePassword)
    return { token: '', csrfToken: auth.csrfToken, me: auth.user, mustChangePassword: true };
  const requested = new URLSearchParams(location.search).get('organizationId'),
    organization = requested
      ? auth.user.organizations.find((o) => o.id === requested)
      : auth.user.organizations[0];
  if (!organization) throw new Error('当前账号不属于此链接对应的组织，请切换账号。');
  const me = await new Api('', organization.id, auth.csrfToken).request<S['CurrentUser']>('/me');
  return { token: '', csrfToken: auth.csrfToken, me, mustChangePassword: false };
}
function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="account-shell">
      <header className="account-header">
        <a className="account-brand" href="/" aria-label="Enterprise AI Studio 首页">
          <span className="account-brand-mark">
            <Mark />
          </span>
          <span>Enterprise AI Studio</span>
        </a>
        <span className="account-header-label">企业应用平台</span>
      </header>
      <div className="account-stage">
        <section className="account-surface">
          <aside className="account-art-panel">
            <div className="account-art-heading">
              <span className="account-art-monogram">
                <Mark />
              </span>
              <span>
                Enterprise
                <br />
                <b>AI Studio</b>
              </span>
            </div>
            <AuthenticationArt />
            <div className="account-art-caption">
              <span>
                <Icon name="code" size={16} />
                应用
              </span>
              <i />
              <span>
                <Icon name="chart" size={16} />
                报表
              </span>
              <i />
              <span>
                <Icon name="database" size={16} />
                数据
              </span>
            </div>
          </aside>
          <section className="account-form-panel">
            <div className="account-form-container">{children}</div>
          </section>
        </section>
      </div>
    </main>
  );
}
export function AccountLogin({ onSession }: { onSession: (s: WebSession) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login'),
    [username, setUsername] = useState(''),
    [displayName, setDisplayName] = useState(''),
    [password, setPassword] = useState(''),
    [confirmation, setConfirmation] = useState(''),
    [invitation, setInvitation] = useState(''),
    [error, setError] = useState(''),
    [info, setInfo] = useState(''),
    [busy, setBusy] = useState(false),
    [options, setOptions] = useState<S['AuthOptions'] | null>(null),
    [organization, setOrganization] = useState(''),
    [useInvitation, setUseInvitation] = useState(false);
  const loadOptions = useCallback(async (signal?: AbortSignal) => {
    const value = await new Api('', null).request<S['AuthOptions']>(
      '/auth/options',
      signal ? { signal } : {},
    );
    setOptions(value);
    setOrganization((current) =>
      value.openOrganizations.some((org) => org.id === current)
        ? current
        : (value.openOrganizations[0]?.id ?? ''),
    );
  }, []);
  useEffect(() => {
    const abort = new AbortController(),
      refresh = () => {
        void loadOptions(abort.signal).catch((e) => {
          if (!abort.signal.aborted) setError(accountError(e));
        });
      };
    refresh();
    window.addEventListener('focus', refresh);
    return () => {
      abort.abort();
      window.removeEventListener('focus', refresh);
    };
  }, [loadOptions, mode]);
  const organizations = options?.openOrganizations ?? [],
    invitationRequired = organizations.length === 0 || useInvitation;
  async function submit() {
    setBusy(true);
    setError('');
    setInfo('');
    try {
      const api = new Api('', null);
      if (mode === 'register') {
        if (password !== confirmation) throw new Error('两次输入的密码不一致。');
        await api.request('/auth/register', {
          method: 'POST',
          body: {
            username: username.trim(),
            displayName: displayName.trim(),
            password,
            ...(invitationRequired
              ? { invitationCode: invitation.trim() }
              : { organizationId: organization }),
          },
        });
        setPassword('');
        setConfirmation('');
        setInvitation('');
        setMode('login');
        setInfo('注册成功，请登录。');
      } else {
        const auth = await api.request<S['BrowserSession']>('/auth/login', {
          method: 'POST',
          body: { username: username.trim(), password },
        });
        setPassword('');
        onSession(await hydrateSession(auth));
      }
    } catch (e) {
      setError(accountError(e));
      if (e instanceof ApiError && e.code === 'INVITATION_REQUIRED') {
        setUseInvitation(true);
        void loadOptions().catch(() => {});
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthShell>
      <form
        className="account-form"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <h2>{mode === 'login' ? '登录' : '注册账号'}</h2>
        <p>
          {mode === 'login'
            ? '使用企业账号登录。'
            : invitationRequired
              ? '请输入管理员提供的邀请码。'
              : '填写账号信息即可注册。'}
        </p>
        {error && <ErrorBanner error={error} />}
        {info && (
          <div className="account-success" role="status">
            <Icon name="check" size={16} />
            {info}
          </div>
        )}
        {options && !options.passwordEnabled && (
          <ErrorBanner error="服务尚未启用账号登录，请联系系统管理员。" />
        )}
        <label>
          账号
          <input
            autoFocus
            required
            name="username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            minLength={3}
            maxLength={64}
            pattern="[a-zA-Z][a-zA-Z0-9_.-]{2,63}"
            placeholder="输入你的账号"
          />
          {mode === 'register' && (
            <small>3–64 位，字母开头，可使用数字、下划线、短横线和点。</small>
          )}
        </label>
        {mode === 'register' && (
          <label>
            姓名或昵称
            <input
              required
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={80}
              placeholder="团队中显示的名字"
            />
          </label>
        )}
        <label>
          密码
          <input
            required
            type="password"
            name="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={mode === 'register' ? 12 : 1}
            maxLength={128}
            placeholder={mode === 'login' ? '输入密码' : '至少 12 个字符'}
          />
        </label>
        {mode === 'register' && (
          <>
            <label>
              确认密码
              <input
                required
                type="password"
                autoComplete="new-password"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                minLength={12}
                maxLength={128}
                placeholder="再次输入密码"
              />
            </label>
            {invitationRequired ? (
              <label>
                企业邀请码
                <input
                  required
                  value={invitation}
                  onChange={(e) => setInvitation(e.target.value)}
                  autoComplete="off"
                  placeholder="向企业管理员获取邀请码"
                />
              </label>
            ) : organizations.length > 1 ? (
              <label>
                所属组织
                <select
                  required
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                >
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="account-note">注册到 {organizations[0]?.name}</p>
            )}
          </>
        )}
        <Button type="submit" variant="primary" disabled={busy || !options?.passwordEnabled}>
          {busy ? '正在处理…' : mode === 'login' ? '登录' : '注册账号'}
        </Button>
        {mode === 'register' && organizations.length > 0 && (
          <button
            type="button"
            className="account-registration-route"
            disabled={busy}
            onClick={() => {
              setUseInvitation((value) => !value);
              setError('');
            }}
          >
            {invitationRequired ? '直接注册' : '使用邀请码注册'}
          </button>
        )}
        <div className="account-switch">
          {mode === 'login' ? '还没有账号？' : '已有账号？'}
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setUseInvitation(false);
              setError('');
              setInfo('');
              setPassword('');
              setConfirmation('');
            }}
          >
            {mode === 'login' ? '注册账号' : '返回登录'}
          </button>
        </div>
        {mode === 'login' && <p className="account-forgot">忘记密码？请联系系统管理员重置。</p>}
      </form>
    </AuthShell>
  );
}
export function PasswordFields({
  api,
  firstLogin,
  onChanged,
}: {
  api: Api;
  firstLogin: boolean;
  onChanged: (s: WebSession) => void;
}) {
  const [current, setCurrent] = useState(''),
    [next, setNext] = useState(''),
    [confirmation, setConfirmation] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <form
      className="account-password-form"
      onSubmit={(e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        void (async () => {
          try {
            if (next !== confirmation) throw new Error('两次输入的新密码不一致。');
            const auth = await api.request<S['BrowserSession']>('/auth/password', {
              method: 'POST',
              body: { currentPassword: current, newPassword: next },
            });
            setCurrent('');
            setNext('');
            setConfirmation('');
            onChanged(await hydrateSession(auth));
          } catch (e) {
            setError(accountError(e, '当前密码错误，请重新输入。'));
          } finally {
            setBusy(false);
          }
        })();
      }}
    >
      {error && <ErrorBanner error={error} />}
      <label>
        {firstLogin ? '临时密码' : '当前密码'}
        <input
          type="password"
          required
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          maxLength={128}
        />
      </label>
      <label>
        新密码
        <input
          type="password"
          required
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          minLength={12}
          maxLength={128}
        />
        <small>至少 12 个字符，建议使用密码管理器生成。</small>
      </label>
      <label>
        确认新密码
        <input
          type="password"
          required
          autoComplete="new-password"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          minLength={12}
          maxLength={128}
        />
      </label>
      <Button type="submit" variant="primary" disabled={busy}>
        {busy ? '正在更新…' : firstLogin ? '保存密码并进入' : '更新密码'}
      </Button>
      <p className="account-note">密码更新后，其他网页会话将退出登录。</p>
    </form>
  );
}
export function FirstPasswordChange({
  session,
  onSession,
  onLogout,
}: {
  session: WebSession;
  onSession: (s: WebSession) => void;
  onLogout: () => void;
}) {
  return (
    <AuthShell>
      <div className="account-form">
        <span className="account-symbol">
          <Icon name="lock" size={22} />
        </span>
        <h2>设置你的新密码</h2>
        <p>首次登录，请将管理员提供的临时密码更换为自己的密码。</p>
        <PasswordFields
          api={new Api('', null, session.csrfToken)}
          firstLogin
          onChanged={onSession}
        />
        <button className="account-back-link" onClick={onLogout}>
          退出登录
        </button>
      </div>
    </AuthShell>
  );
}
export function AuthenticationLoading() {
  return (
    <main className="account-restoring">
      <Loading />
    </main>
  );
}
export const isNoSession = (error: unknown) => error instanceof ApiError && error.status === 401;
