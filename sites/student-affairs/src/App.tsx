import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, errorText, type S, type Student } from './data';
import { Brand, Button, ErrorBox, Icon, Loading } from './components';
import { Students } from './students';
import { Certificates } from './certificates';
import { Settings } from './settings';
import { PrintStation } from './paper';
export function App() {
  const [session, setSession] = useState<S['StudentCenterSession'] | null>(null),
    [data, setData] = useState<S['StudentCenterBootstrap'] | null>(null),
    [page, setPage] = useState<'students' | 'certificates'>('students'),
    [error, setError] = useState(''),
    [initial, setInitial] = useState(true),
    [settings, setSettings] = useState(false),
    [settingsTab, setSettingsTab] = useState('profile'),
    [notice, setNotice] = useState(''),
    [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const refresh = useCallback(async () => {
    const r = await api('bootstrap', {});
    setData(r);
  }, []);
  useEffect(() => {
    let active = true;
    void api('auth.session', {})
      .then(async (r) => {
        if (!active) return;
        setSession(r);
        if (r.user) await refresh();
      })
      .catch((e) => {
        if (active) setError(errorText(e));
      })
      .finally(() => {
        if (active) setInitial(false);
      });
    return () => {
      active = false;
    };
  }, [refresh]);
  useEffect(() => {
    const expired = () => {
      setSession((old) => (old ? { ...old, user: null } : null));
      setData(null);
      setError('登录已失效，请重新登录。');
    };
    window.addEventListener('student-center.session-expired', expired);
    return () => window.removeEventListener('student-center.session-expired', expired);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 3200);
    return () => clearTimeout(t);
  }, [notice]);
  async function loggedIn(r: S['StudentCenterSession']) {
    setSession(r);
    setError('');
    try {
      await refresh();
    } catch (e) {
      setError(errorText(e));
    }
  }
  async function logout() {
    try {
      const r = await api('auth.logout', {});
      setSession(r);
      setData(null);
    } catch (e) {
      setNotice(errorText(e));
    }
  }
  const changed = () => {
    void refresh().catch((e) => setNotice(errorText(e)));
  };
  if (initial)
    return (
      <div className="boot">
        <Brand />
        <Loading />
      </div>
    );
  if (!session?.user)
    return (
      <Login
        department={session?.departmentName ?? '学生事务中心'}
        onLogin={loggedIn}
        initialError={error}
      />
    );
  if (!data)
    return (
      <div className="boot">
        <Brand />
        <ErrorBox error={error} />
        <Button onClick={() => void refresh().catch((e) => setError(errorText(e)))}>
          重新加载
        </Button>
        <Button onClick={() => void logout()}>退出登录</Button>
      </div>
    );
  return (
    <>
      <div className="workbench">
        <aside className="sidebar">
          <a className="brand" href="#" onClick={(e) => e.preventDefault()}>
            <Brand />
            <span>
              {data.settings.departmentName}
              <small>工作台</small>
            </span>
          </a>
          <div className="sidebar-label">工作区</div>
          <nav>
            <button
              className={page === 'students' ? 'active' : ''}
              onClick={() => setPage('students')}
            >
              <Icon name="students" />
              学生数据管理
              <Icon name="arrow" size={15} />
            </button>
            <button
              className={page === 'certificates' ? 'active' : ''}
              onClick={() => setPage('certificates')}
            >
              <Icon name="certificate" />
              证明开具
              <Icon name="arrow" size={15} />
            </button>
          </nav>
          <div className="sidebar-bottom">
            {data.currentUser.role === 'administrator' && (
              <button
                onClick={() => {
                  setSettingsTab('general');
                  setSettings(true);
                }}
              >
                <Icon name="settings" size={18} />
                工作台设置
              </button>
            )}
            <button
              className="account"
              onClick={() => {
                setSettingsTab('profile');
                setSettings(true);
              }}
            >
              <span className="account-avatar">{data.currentUser.name.slice(-1)}</span>
              <span>
                <strong>{data.currentUser.name}</strong>
                <small>{data.currentUser.role === 'administrator' ? '管理员' : '工作人员'}</small>
              </span>
              <Icon name="settings" size={16} />
            </button>
            <button className="logout" onClick={() => void logout()}>
              <Icon name="logout" size={17} />
              退出登录
            </button>
          </div>
        </aside>
        <div className="workspace">
          <header className="topbar">
            <div>
              <span>{data.settings.departmentName}</span>
              <span className="breadcrumb-slash">/</span>
              <strong>{page === 'students' ? '学生数据管理' : '证明开具'}</strong>
            </div>
            <div className="topbar-right">
              <Icon name="calendar" size={16} />
              <span>
                {new Date().toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'short',
                })}
              </span>
              <span className="internal-badge">
                <i />
                部门内部
              </span>
            </div>
          </header>
          <main className="main-content">
            {page === 'students' ? (
              <Students
                data={data}
                onChanged={changed}
                notify={setNotice}
                onIssue={(student) => {
                  setSelectedStudent(student);
                  setPage('certificates');
                }}
              />
            ) : (
              <Certificates
                initialStudent={selectedStudent}
                data={data}
                onChanged={changed}
                notify={setNotice}
              />
            )}
          </main>
        </div>
        {settings && (
          <Settings
            data={data}
            initialTab={settingsTab}
            onClose={() => setSettings(false)}
            onChanged={changed}
            notify={setNotice}
          />
        )}
        {notice && (
          <div className="toast" role="status">
            <Icon name="check" size={17} />
            {notice}
          </div>
        )}
      </div>
      <PrintStation />
    </>
  );
}
function Login({
  department,
  onLogin,
  initialError,
}: {
  department: string;
  onLogin: (r: S['StudentCenterSession']) => Promise<void>;
  initialError: string;
}) {
  const [username, setUsername] = useState(''),
    [password, setPassword] = useState(''),
    [visible, setVisible] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(initialError);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onLogin(await api('auth.login', { username, password }));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-page">
      <header>
        <Brand />
        <strong>{department}</strong>
      </header>
      <section className="login-surface">
        <aside className="login-art">
          <div className="art-top">
            <span className="art-label">学生事务</span>
            <Icon name="book" size={22} />
          </div>
          <div className="paper-illustration">
            <div className="illustration-back" />
            <div className="illustration-paper">
              <div className="illustration-mark">
                <Brand />
              </div>
              <span className="illustration-title">在 校 证 明</span>
              <div className="illustration-lines">
                <i />
                <i />
                <i />
                <i />
              </div>
              <div className="illustration-sign">
                <i />
                <i />
              </div>
              <span className="illustration-check">
                <Icon name="check" size={26} />
              </span>
            </div>
            <span className="art-note art-note-1">
              <Icon name="students" size={17} />
              学生档案
            </span>
            <span className="art-note art-note-2">
              <Icon name="certificate" size={17} />
              证明开具
            </span>
          </div>
          <div className="login-art-caption">
            <h1>{department}</h1>
            <p>学生档案与日常证明管理</p>
          </div>
        </aside>
        <div className="login-form-wrap">
          <form onSubmit={(e) => void submit(e)}>
            <span className="login-icon">
              <Icon name="lock" size={22} />
            </span>
            <h2>工作人员登录</h2>
            <p className="form-caption">使用部门账号登录。</p>
            <ErrorBox error={error} />
            <label>
              账号
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                placeholder="请输入账号"
                autoFocus
              />
            </label>
            <label>
              密码
              <div className="password-control">
                <input
                  type={visible ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="请输入密码"
                />
                <button
                  type="button"
                  aria-label={visible ? '隐藏密码' : '显示密码'}
                  onClick={() => setVisible(!visible)}
                >
                  <Icon name="eye" size={18} />
                </button>
              </div>
            </label>
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? '正在登录…' : '登录'}
              <Icon name="arrow" size={17} />
            </Button>
            <div className="login-account-note">
              <Icon name="info" size={15} />
              账号由部门管理员分配
            </div>
          </form>
        </div>
      </section>
      <footer>{department} · 内部工作系统</footer>
    </main>
  );
}
