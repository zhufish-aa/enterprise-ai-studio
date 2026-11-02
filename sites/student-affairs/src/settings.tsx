import { useEffect, useState, type FormEvent } from 'react';
import { api, errorText, type S } from './data';
import { Button, DateInput, ErrorBox, Icon, Loading, Modal } from './components';
export function Settings({
  data,
  initialTab,
  onClose,
  onChanged,
  notify,
}: {
  data: S['StudentCenterBootstrap'];
  initialTab: string;
  onClose: () => void;
  onChanged: () => void;
  notify: (s: string) => void;
}) {
  const [tab, setTab] = useState(initialTab),
    admin = data.currentUser.role === 'administrator';
  return (
    <Modal title="工作台设置" wide onClose={onClose}>
      <div className="settings-tabs">
        <button className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}>
          个人账号
        </button>
        {admin && (
          <>
            <button className={tab === 'general' ? 'active' : ''} onClick={() => setTab('general')}>
              学校与部门
            </button>
            <button className={tab === 'members' ? 'active' : ''} onClick={() => setTab('members')}>
              工作人员
            </button>
          </>
        )}
      </div>
      {tab === 'general' && admin ? (
        <General
          data={data}
          onSaved={() => {
            onChanged();
            notify('工作台设置已保存');
          }}
        />
      ) : tab === 'members' && admin ? (
        <Members notify={notify} />
      ) : (
        <Profile user={data.currentUser} notify={notify} />
      )}
    </Modal>
  );
}
function General({ data, onSaved }: { data: S['StudentCenterBootstrap']; onSaved: () => void }) {
  const [settings, setSettings] = useState({ ...data.settings }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      setSettings(await api('settings.save', settings));
      onSaved();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="settings-form" onSubmit={(e) => void submit(e)}>
      <ErrorBox error={error} />
      <div className="settings-form-title">
        <h3>学校与部门</h3>
        <p>用于证明中的默认学校、落款和放假时间。</p>
      </div>
      <div className="form-grid">
        {[
          { key: 'schoolName', label: '学校名称', full: true },
          { key: 'departmentName', label: '部门名称' },
          { key: 'signature', label: '证明落款' },
          { key: 'academicYear', label: '当前学年', full: true },
          { key: 'holidayStart', label: '放假开始时间', date: true },
          { key: 'holidayEnd', label: '放假结束时间', date: true },
        ].map((item) => (
          <label key={item.key} className={item.full ? 'span-2' : ''}>
            {item.label}
            {item.date ? (
              <DateInput
                value={String(settings[item.key as keyof typeof settings])}
                onChange={(e) => setSettings((s) => ({ ...s, [item.key]: e.target.value }))}
              />
            ) : (
              <input
                type="text"
                value={String(settings[item.key as keyof typeof settings])}
                onChange={(e) => setSettings((s) => ({ ...s, [item.key]: e.target.value }))}
                placeholder={item.key === 'academicYear' ? '例如：2026—2027 学年' : undefined}
              />
            )}
          </label>
        ))}
      </div>
      <div className="settings-save">
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? '正在保存…' : '保存设置'}
        </Button>
      </div>
    </form>
  );
}
function Profile({
  user,
  notify,
}: {
  user: S['StudentCenterMember'];
  notify: (s: string) => void;
}) {
  const [currentPassword, setCurrent] = useState(''),
    [password, setPassword] = useState(''),
    [repeat, setRepeat] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password !== repeat) {
      setError('两次输入的新密码不一致。');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api('auth.password', { currentPassword, password });
      setCurrent('');
      setPassword('');
      setRepeat('');
      notify('密码已修改');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="settings-form">
      <div className="profile-account">
        <span className="account-avatar">{user.name.slice(-1)}</span>
        <div>
          <strong>{user.name}</strong>
          <small>
            {user.username} · {user.role === 'administrator' ? '管理员' : '工作人员'}
          </small>
        </div>
      </div>
      <form onSubmit={(e) => void submit(e)}>
        <h3>修改密码</h3>
        <ErrorBox error={error} />
        <div className="form-grid">
          <label className="span-2">
            当前密码
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          <label>
            新密码
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </label>
          <label>
            确认新密码
            <input
              type="password"
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
              autoComplete="new-password"
              required
            />
          </label>
        </div>
        <div className="settings-save">
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? '正在保存…' : '修改密码'}
          </Button>
        </div>
      </form>
    </div>
  );
}
function Members({ notify }: { notify: (s: string) => void }) {
  const [members, setMembers] = useState<S['StudentCenterMembers'] | null>(null),
    [editing, setEditing] = useState<S['StudentCenterMember'] | 'new' | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    void api('members.list', {})
      .then(setMembers)
      .catch((e) => setError(errorText(e)));
  }, []);
  async function remove(member: S['StudentCenterMember']) {
    setBusy(true);
    setError('');
    try {
      setMembers(await api('members.save', { userId: member.userId, role: 'remove' }));
      notify('账号已停用');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="members-settings">
      <div className="members-heading">
        <div>
          <h3>工作人员</h3>
          <p>这些账号仅用于当前学生事务系统。</p>
        </div>
        <Button variant="primary" icon="plus" onClick={() => setEditing('new')}>
          添加账号
        </Button>
      </div>
      <ErrorBox error={error} />
      {!members ? (
        <Loading />
      ) : (
        <div className="members-list">
          {members.items.map((m) => (
            <article key={m.userId}>
              <span className="account-avatar">{m.name.slice(-1)}</span>
              <div>
                <strong>{m.name}</strong>
                <small>{m.username}</small>
              </div>
              <span className={'member-role ' + (m.role === 'administrator' ? 'admin' : '')}>
                {m.role === 'administrator' ? '管理员' : '工作人员'}
              </span>
              <Button variant="text" disabled={busy} onClick={() => setEditing(m)}>
                编辑
              </Button>
              <Button variant="text danger-text" disabled={busy} onClick={() => void remove(m)}>
                停用
              </Button>
            </article>
          ))}
        </div>
      )}
      {editing && (
        <MemberEditor
          member={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(r) => {
            setMembers(r);
            setEditing(null);
            notify('工作人员账号已保存');
          }}
        />
      )}
      <div className="role-description">
        <Icon name="info" size={16} />
        <span>工作人员可维护学生和开具证明；管理员还可管理模板、账号与工作台设置。</span>
      </div>
    </div>
  );
}
function MemberEditor({
  member,
  onClose,
  onSaved,
}: {
  member: S['StudentCenterMember'] | null;
  onClose: () => void;
  onSaved: (r: S['StudentCenterMembers']) => void;
}) {
  const [username, setUsername] = useState(member?.username ?? ''),
    [name, setName] = useState(member?.name ?? ''),
    [role, setRole] = useState<'administrator' | 'staff'>(member?.role ?? 'staff'),
    [password, setPassword] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      onSaved(
        await api('members.save', {
          ...(member ? { userId: member.userId } : {}),
          username,
          name,
          role,
          ...(password ? { password } : {}),
        }),
      );
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={member ? '编辑工作人员' : '添加工作人员'}
      onClose={() => {
        if (!busy) onClose();
      }}
      footer={
        <>
          <Button disabled={busy} onClick={onClose}>
            取消
          </Button>
          <Button variant="primary" type="submit" form="member-form" disabled={busy}>
            {busy ? '正在保存…' : '保存账号'}
          </Button>
        </>
      }
    >
      <ErrorBox error={error} />
      <form id="member-form" onSubmit={(e) => void submit(e)} className="form-stack">
        <label>
          账号
          <input
            required
            value={username}
            disabled={!!member}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="off"
            placeholder="例如：zhangsan"
          />
        </label>
        <label>
          姓名
          <input required value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          角色
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'administrator' | 'staff')}
          >
            <option value="staff">工作人员</option>
            <option value="administrator">管理员</option>
          </select>
        </label>
        <label>
          {member ? '重置密码' : '初始密码'}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required={!member}
            autoComplete="new-password"
            placeholder={member ? '留空保留原密码' : '输入初始密码'}
          />
        </label>
      </form>
    </Modal>
  );
}
