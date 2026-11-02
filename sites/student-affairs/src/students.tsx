import { useEffect, useState, type FormEvent } from 'react';
import {
  api,
  csvTemplate,
  errorText,
  fields,
  fileBase64,
  idTypeOptions,
  initials,
  mask,
  profileFields,
  profileValue,
  shortDate,
  dateFields,
  type S,
  type Student,
} from './data';
import {
  Button,
  DateInput,
  Empty,
  ErrorBox,
  Icon,
  Loading,
  Modal,
  Pager,
  Status,
} from './components';
export function Students({
  data,
  onChanged,
  notify,
  onIssue,
}: {
  data: S['StudentCenterBootstrap'];
  onChanged: () => void;
  notify: (v: string) => void;
  onIssue: (student: Student) => void;
}) {
  const [result, setResult] = useState<S['StudentSearchResult'] | null>(null),
    [query, setQuery] = useState(''),
    [className, setClass] = useState(''),
    [status, setStatus] = useState(''),
    [page, setPage] = useState(1),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [edit, setEdit] = useState<Student | 'new' | null>(null),
    [importing, setImporting] = useState(false),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const a = new AbortController(),
      timer = setTimeout(
        () => {
          setLoading(true);
          void api(
            'students.search',
            { keyword: query, className, status, page, pageSize: 12 },
            a.signal,
          )
            .then((r) => {
              setResult(r);
              setError('');
            })
            .catch((e) => {
              if (!a.signal.aborted) setError(errorText(e));
            })
            .finally(() => {
              if (!a.signal.aborted) setLoading(false);
            });
        },
        query ? 220 : 0,
      );
    return () => {
      clearTimeout(timer);
      a.abort();
    };
  }, [query, className, status, page, revision]);
  const reload = () => {
    setRevision((n) => n + 1);
    onChanged();
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="heading-eyebrow">学生档案</div>
          <h1>
            学生数据<span className="count-badge">{data.counts.students.toLocaleString()}</span>
          </h1>
        </div>
        <div className="heading-actions">
          <Button icon="upload" onClick={() => setImporting(true)}>
            导入学生
          </Button>
          <Button icon="plus" variant="primary" onClick={() => setEdit('new')}>
            添加学生
          </Button>
        </div>
      </div>
      <section className="stats-grid">
        <Stat
          label="学生档案"
          value={data.counts.students}
          unit="人"
          icon="students"
          color="blue"
        />
        <Stat
          label="累计开具"
          value={data.counts.certificates}
          unit="份"
          icon="certificate"
          color="teal"
        />
        <Stat
          label="今日开具"
          value={data.counts.todayCertificates}
          unit="份"
          icon="clock"
          color="amber"
        />
      </section>
      <section className="data-panel">
        <div className="panel-top">
          <div>
            <h2>学生列表</h2>
            <span>共 {result?.total ?? data.counts.students} 名学生</span>
          </div>
          <div className="panel-filters">
            <div className="search-control">
              <Icon name="search" size={17} />
              <input
                aria-label="搜索学号或姓名"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="搜索学号或姓名"
              />
              {query && (
                <button
                  onClick={() => {
                    setQuery('');
                    setPage(1);
                  }}
                  aria-label="清空搜索"
                >
                  <Icon name="close" size={14} />
                </button>
              )}
            </div>
            <select
              aria-label="班级筛选"
              value={className}
              onChange={(e) => {
                setClass(e.target.value);
                setPage(1);
              }}
            >
              <option value="">全部班级</option>
              {result?.classes.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
            <select
              aria-label="学籍状态筛选"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">全部状态</option>
              {['在读', '已毕业', '肄业', '休学'].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
            <Button
              className="refresh-button"
              title="刷新"
              aria-label="刷新"
              icon="refresh"
              onClick={() => setRevision((n) => n + 1)}
            />
          </div>
        </div>
        <ErrorBox error={error} />
        {loading && !result ? (
          <Loading />
        ) : result?.items.length ? (
          <>
            <div className={'table-scroll' + (loading ? ' refreshing' : '')}>
              <table className="student-table">
                <thead>
                  <tr>
                    <th>学生</th>
                    <th>学号</th>
                    <th>班级 / 年级</th>
                    <th>证件类型</th>
                    <th>学籍状态</th>
                    <th>更新日期</th>
                    <th className="align-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((student, i) => {
                    const p = student.profile;
                    return (
                      <tr key={student.id}>
                        <td>
                          <div className="student-name">
                            <span className={'student-avatar color-' + (i % 4)}>
                              {initials(p.name)}
                            </span>
                            <div>
                              <strong>{p.name}</strong>
                              <small>
                                {[p.gender, p.ethnicity].filter(Boolean).join(' · ') || '学生档案'}
                              </small>
                            </div>
                          </div>
                        </td>
                        <td className="mono">{p.studentNumber}</td>
                        <td>
                          {p.className || '—'}
                          <small>{p.grade || ''}</small>
                        </td>
                        <td>
                          {profileValue(p, 'idType') || '—'}
                          {profileValue(p, 'idNumber') ? (
                            <small className="mono">{mask(profileValue(p, 'idNumber'))}</small>
                          ) : null}
                        </td>
                        <td>
                          <Status value={p.status ?? ''} />
                        </td>
                        <td className="muted">{shortDate(student.updatedAt)}</td>
                        <td>
                          <div className="row-actions">
                            <button onClick={() => onIssue(student)}>开具证明</button>
                            <button
                              title="编辑学生"
                              aria-label={'编辑 ' + p.name}
                              onClick={() => setEdit(student)}
                            >
                              <Icon name="edit" size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pager page={page} total={result.total} pageSize={12} onChange={setPage} />
          </>
        ) : (
          <Empty title={query || className || status ? '没有找到匹配的学生' : '还没有学生档案'}>
            <p>
              {query || className || status
                ? '换个关键词，或清除筛选条件。'
                : '导入学生表格，或添加第一位学生。'}
            </p>
            <Button icon="upload" onClick={() => setImporting(true)}>
              导入学生
            </Button>
          </Empty>
        )}
      </section>
      <div className="page-footnote">
        <Icon name="lock" size={14} />
        学生资料仅供本部门工作人员使用
      </div>
      {edit && (
        <StudentEditor
          value={edit === 'new' ? null : edit}
          admin={data.currentUser.role === 'administrator'}
          onClose={() => setEdit(null)}
          onSaved={() => {
            setEdit(null);
            reload();
            notify('学生信息已保存');
          }}
        />
      )}
      {importing && (
        <ImportStudents
          onClose={() => setImporting(false)}
          onImported={(count) => {
            setImporting(false);
            reload();
            notify('已导入 ' + count + ' 名学生');
          }}
        />
      )}
    </>
  );
}
function Stat({
  label,
  value,
  unit,
  icon,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  icon: string;
  color: string;
}) {
  return (
    <div className="stat">
      <span className={'stat-icon ' + color}>
        <Icon name={icon} size={22} />
      </span>
      <div>
        <span className="stat-label">{label}</span>
        <div className="stat-value">
          {value.toLocaleString()}
          <small>{unit}</small>
        </div>
      </div>
      <span className="stat-decoration" />
    </div>
  );
}
export function StudentEditor({
  value,
  admin,
  onClose,
  onSaved,
}: {
  value: Student | null;
  admin: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [profile, setProfile] = useState<S['StudentProfile']>(
      value
        ? { ...value.profile }
        : ({
            studentNumber: '',
            name: '',
            status: '在读',
            idType: '大陆身份证',
          } as S['StudentProfile']),
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [remove, setRemove] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('students.save', {
        profile,
        ...(value ? { id: value.id, revision: value.revision } : {}),
      });
      onSaved();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function archive() {
    if (!value) return;
    setBusy(true);
    try {
      await api('students.archive', { id: value.id, revision: value.revision });
      onSaved();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  const group = [
    {
      title: '基本信息',
      keys: ['studentNumber', 'name', 'gender', 'birthDate', 'idNumber', 'idType', 'ethnicity'],
    },
    {
      title: '学籍信息',
      keys: [
        'className',
        'grade',
        'admissionDate',
        'graduationDate',
        'expectedGraduationDate',
        'withdrawalDate',
        'schoolName',
        'status',
      ],
    },
    { title: '证明补充信息', keys: ['academicYear', 'holidayStart', 'holidayEnd'] },
  ];
  return (
    <Modal
      title={value ? '编辑学生' : '添加学生'}
      subtitle={
        value ? value.profile.studentNumber + ' · ' + value.profile.name : '学号与姓名为必填项'
      }
      wide
      onClose={() => {
        if (!busy) onClose();
      }}
      footer={
        <>
          {value && admin && (
            <div className="footer-left">
              {remove ? (
                <>
                  <span>移除后保留已有证明</span>
                  <Button variant="danger" disabled={busy} onClick={() => void archive()}>
                    确认移除
                  </Button>
                </>
              ) : (
                <Button variant="text danger-text" icon="trash" onClick={() => setRemove(true)}>
                  移除学生
                </Button>
              )}
            </div>
          )}
          <Button onClick={onClose} disabled={busy}>
            取消
          </Button>
          <Button variant="primary" type="submit" form="student-form" disabled={busy}>
            {busy ? '正在保存…' : '保存学生'}
          </Button>
        </>
      }
    >
      <ErrorBox error={error} />
      <form id="student-form" onSubmit={(e) => void submit(e)}>
        {group.map((g) => (
          <section className="form-section" key={g.title}>
            <h3>{g.title}</h3>
            <div className="form-grid">
              {g.keys.map((key) => (
                <label
                  key={key}
                  className={key === 'idNumber' || key === 'schoolName' ? 'span-2' : ''}
                >
                  {fields[key]}
                  {['studentNumber', 'name'].includes(key) && <em>*</em>}
                  <StudentField
                    fieldKey={key}
                    value={(profile as Record<string, string>)[key] ?? ''}
                    onChange={(value) => setProfile((p) => ({ ...p, [key]: value }))}
                  />
                </label>
              ))}
            </div>
          </section>
        ))}
      </form>
    </Modal>
  );
}
function ImportStudents({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: (n: number) => void;
}) {
  const [file, setFile] = useState<{ fileName: string; contentBase64: string } | null>(null),
    [preview, setPreview] = useState<S['StudentImportResult'] | null>(null),
    [updateExisting, setUpdate] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [drag, setDrag] = useState(false);
  async function select(input: File | undefined) {
    if (!input) return;
    setBusy(true);
    setError('');
    setPreview(null);
    try {
      const f = { fileName: input.name, contentBase64: await fileBase64(input) };
      setFile(f);
      setPreview(await api('students.import', { ...f, mode: 'preview', updateExisting }));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function changeUpdate(value: boolean) {
    setUpdate(value);
    if (!file) return;
    setBusy(true);
    try {
      setPreview(await api('students.import', { ...file, mode: 'preview', updateExisting: value }));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function commit() {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const r = await api('students.import', { ...file, mode: 'commit', updateExisting });
      onImported(r.created + r.updated);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="导入学生"
      subtitle="支持 Excel（.xlsx）和 UTF-8 CSV"
      wide
      onClose={() => {
        if (!busy) onClose();
      }}
      footer={
        <>
          <span className="footer-left muted">
            {preview ? preview.total + ' 行数据' : '先上传文件，再确认导入'}
          </span>
          <Button onClick={onClose} disabled={busy}>
            取消
          </Button>
          <Button
            variant="primary"
            disabled={busy || !preview || !preview.valid || preview.issues.length > 0}
            onClick={() => void commit()}
          >
            {busy
              ? '正在处理…'
              : preview
                ? '确认导入 ' + (preview.created + preview.updated) + ' 名学生'
                : '确认导入'}
          </Button>
        </>
      }
    >
      <ErrorBox error={error} />
      <label
        className={'upload-zone' + (drag ? ' dragging' : '')}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (!busy) void select(e.dataTransfer.files[0]);
        }}
      >
        <input
          type="file"
          accept=".xlsx,.csv"
          disabled={busy}
          onChange={(e) => void select(e.target.files?.[0])}
        />
        <span className="upload-zone-icon">
          <Icon name="upload" size={25} />
        </span>
        <strong>{file ? file.fileName : '点击选择，或将表格拖到这里'}</strong>
        <span>{file ? '点击可更换文件' : '第一行为表头，学号和姓名为必填列'}</span>
      </label>
      <div className="import-help">
        <span>学号、证件号码请按文本填写，日期格式为 YYYY-MM-DD。</span>
        <Button variant="text" icon="download" onClick={csvTemplate}>
          下载导入表
        </Button>
      </div>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={updateExisting}
          disabled={busy}
          onChange={(e) => void changeUpdate(e.target.checked)}
        />
        更新相同学号的学生信息
      </label>
      {busy && !preview ? (
        <Loading />
      ) : (
        preview && (
          <>
            <div className="import-summary">
              <span>
                新增 <b>{preview.created}</b>
              </span>
              <span>
                更新 <b>{preview.updated}</b>
              </span>
              <span>
                跳过 <b>{preview.skipped}</b>
              </span>
              <span className={preview.issues.length ? 'issue-count' : ''}>
                待修正 <b>{preview.issues.length}</b>
              </span>
            </div>
            {preview.issues.length > 0 && (
              <div className="import-issues">
                <strong>请修正以下数据后重新上传</strong>
                {preview.issues.map((issue, i) => (
                  <div key={i}>
                    第 {issue.row} 行 · {issue.message}
                  </div>
                ))}
              </div>
            )}
            <div className="import-preview">
              <h3>
                数据预览 <small>前 {preview.sample.length} 条</small>
              </h3>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>学号</th>
                      <th>姓名</th>
                      <th>性别</th>
                      <th>班级</th>
                      <th>状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.sample.map((p, i) => (
                      <tr key={i}>
                        <td className="mono">{p.studentNumber}</td>
                        <td>{p.name}</td>
                        <td>{p.gender || '—'}</td>
                        <td>{p.className || '—'}</td>
                        <td>{p.status || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )
      )}
      <details className="supported-fields">
        <summary>可导入的字段</summary>
        <div>
          {profileFields.map((k) => (
            <span key={k}>{fields[k]}</span>
          ))}
        </div>
      </details>
    </Modal>
  );
}

function StudentField({
  fieldKey,
  value,
  onChange,
}: {
  fieldKey: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const choices =
    fieldKey === 'status'
      ? ['在读', '已毕业', '肄业', '休学']
      : fieldKey === 'gender'
        ? ['男', '女', '未说明']
        : fieldKey === 'idType'
          ? idTypeOptions
          : null;
  if (choices)
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">请选择{fields[fieldKey]}</option>
        {value && !choices.includes(value) && <option value={value}>{value}</option>}
        {choices.map((option) => (
          <option value={option} key={option}>
            {option}
          </option>
        ))}
      </select>
    );
  if (dateFields.has(fieldKey))
    return <DateInput value={value} onChange={(e) => onChange(e.target.value)} />;
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={fieldKey === 'studentNumber' || fieldKey === 'name'}
      placeholder={fieldKey === 'idNumber' ? '身份证或其他有效证件号码' : undefined}
    />
  );
}
