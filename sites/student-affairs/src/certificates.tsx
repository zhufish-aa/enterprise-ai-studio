import { useEffect, useState, type FormEvent } from 'react';
import {
  api,
  dateFields,
  downloadBase64,
  errorText,
  fields,
  initials,
  mask,
  populated,
  profileValue,
  shortDate,
  today,
  type Certificate,
  type S,
  type Student,
  type Template,
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
import { Paper, printCertificate } from './paper';
import { Templates } from './templates';
export function Certificates({
  data,
  onChanged,
  notify,
  initialStudent,
}: {
  data: S['StudentCenterBootstrap'];
  onChanged: () => void;
  notify: (s: string) => void;
  initialStudent: Student | null;
}) {
  const [tab, setTab] = useState<'issue' | 'history' | 'templates'>('issue');
  return (
    <div
      className={
        'certificate-page' +
        (tab === 'issue' && data.templates.length ? ' certificate-page-issue' : '')
      }
    >
      <div className="page-heading">
        <div>
          <div className="heading-eyebrow">日常事务</div>
          <h1>证明开具</h1>
        </div>
        <div className="segmented" aria-label="证明栏目">
          <button className={tab === 'issue' ? 'active' : ''} onClick={() => setTab('issue')}>
            <Icon name="certificate" size={16} />
            开具证明
          </button>
          <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>
            开具记录
          </button>
          {data.currentUser.role === 'administrator' && (
            <button
              className={tab === 'templates' ? 'active' : ''}
              onClick={() => setTab('templates')}
            >
              证明模板
            </button>
          )}
        </div>
      </div>
      {tab === 'issue' ? (
        data.templates.length ? (
          <Issue
            data={data}
            onChanged={onChanged}
            notify={notify}
            initialStudent={initialStudent}
          />
        ) : (
          <Empty title="还没有可用的证明模板" icon="certificate">
            <p>
              {data.currentUser.role === 'administrator'
                ? '请在“证明模板”中添加模板。'
                : '请联系管理员添加证明模板。'}
            </p>
          </Empty>
        )
      ) : tab === 'history' ? (
        <History />
      ) : (
        <Templates templates={data.templates} onChanged={onChanged} notify={notify} />
      )}
    </div>
  );
}
function Issue({
  data,
  onChanged,
  notify,
  initialStudent,
}: {
  data: S['StudentCenterBootstrap'];
  onChanged: () => void;
  notify: (s: string) => void;
  initialStudent: Student | null;
}) {
  const [student, setStudent] = useState<Student | null>(initialStudent),
    [number, setNumber] = useState(''),
    [name, setName] = useState(''),
    [matches, setMatches] = useState<Student[] | null>(null),
    [searching, setSearching] = useState(false),
    [kind, setKind] = useState(data.templates[0]?.kind ?? 'enrollment'),
    [extra, setExtra] = useState<Record<string, string>>({}),
    [issueDate, setIssueDate] = useState(today()),
    [certificate, setCertificate] = useState<Certificate | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [zoom, setZoom] = useState(0.68),
    [wordDraft, setWordDraft] = useState<S['StudentCertificatePreview'] | null>(null),
    [wordError, setWordError] = useState('');
  const t = data.templates.find((t) => t.kind === kind) ?? data.templates[0]!,
    values = populated(student, data.settings, extra, issueDate),
    formFields = t.requiredFields
      .filter(
        (k) =>
          ![
            'issueDate',
            'certificateNumber',
            'departmentName',
            'templateTitle',
            'schoolName',
          ].includes(k),
      )
      .flatMap((k) => (k === 'holidayRange' ? ['holidayStart', 'holidayEnd'] : [k]));
  const wordKey = JSON.stringify({
    studentId: student?.id,
    templateId: t.id,
    issueDate,
    extra,
    revision: data.settings.revision,
  });
  useEffect(() => {
    setWordDraft(null);
    setWordError('');
    if (t.format !== 'docx' || !student) return;
    const a = new AbortController(),
      timer = setTimeout(() => {
        void api(
          'certificates.preview',
          { studentId: student.id, templateId: t.id, issueDate, fields: extra },
          a.signal,
        )
          .then(setWordDraft)
          .catch((e) => {
            if (!a.signal.aborted) setWordError(errorText(e));
          });
      }, 450);
    return () => {
      clearTimeout(timer);
      a.abort();
    };
  }, [wordKey]);
  function select(s: Student) {
    setStudent(s);
    setMatches(null);
    setExtra({});
    setCertificate(null);
    setError('');
  }
  async function search(e: FormEvent) {
    e.preventDefault();
    if (!number.trim() && !name.trim()) {
      setError('请填写学号或姓名。');
      return;
    }
    setSearching(true);
    setError('');
    try {
      const r = await api('students.search', {
        studentNumber: number.trim(),
        name: name.trim(),
        pageSize: 20,
        page: 1,
      });
      setMatches(r.items);
      if (r.total === 1 && r.items[0]) select(r.items[0]);
      else if (!r.items.length) setError('没有找到该学生，请核对学号和姓名。');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setSearching(false);
    }
  }
  async function create(print: boolean) {
    if (!student) {
      setError('请先选择学生。');
      return;
    }
    const form = document.getElementById('certificate-fields') as HTMLFormElement | null;
    if (!form?.reportValidity()) return;
    setBusy(true);
    setError('');
    try {
      const r = await api('certificates.create', {
        studentId: student.id,
        templateId: t.id,
        issueDate,
        fields: extra,
      });
      setCertificate(r);
      onChanged();
      if (print) printCertificate(r);
      else notify('证明已生成，开具记录已保存');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  const change = (key: string, value: string) => {
    setExtra((old) => ({ ...old, [key]: value }));
    setCertificate(null);
  };
  return (
    <div className="issue-grid">
      <section className="issue-controls">
        <div className="issue-fields">
          <ErrorBox error={error} />
          <div className="issue-block">
            <h2>
              <span className="step">1</span>选择学生
            </h2>
            {student ? (
              <div className="selected-student">
                <div className="selected-student-header">
                  <span className="student-avatar color-0">{initials(student.profile.name)}</span>
                  <div>
                    <strong>{student.profile.name}</strong>
                    <small className="mono">{student.profile.studentNumber}</small>
                  </div>
                  <Button
                    variant="text"
                    onClick={() => {
                      setStudent(null);
                      setCertificate(null);
                    }}
                  >
                    更换
                  </Button>
                </div>
                <div className="selected-student-details">
                  <span>{student.profile.className || '班级未填写'}</span>
                  <Status value={student.profile.status ?? ''} />
                </div>
                <p>
                  {profileValue(student.profile, 'idType') || '证件号码'}{' '}
                  <span className="mono">{mask(student.profile.idNumber ?? '未填写')}</span>
                </p>
              </div>
            ) : (
              <>
                <form className="student-lookup" onSubmit={(e) => void search(e)}>
                  <label>
                    学号
                    <input
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      placeholder="输入学号"
                    />
                  </label>
                  <label>
                    姓名
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="输入姓名"
                    />
                  </label>
                  <Button type="submit" icon="search" disabled={searching}>
                    {searching ? '正在查找…' : '查找学生'}
                  </Button>
                </form>
                {matches && matches.length > 0 && (
                  <div className="lookup-results">
                    {matches.map((s) => (
                      <button key={s.id} onClick={() => select(s)}>
                        <span>
                          <b>{s.profile.name}</b>
                          <small>
                            {s.profile.studentNumber} · {s.profile.className}
                          </small>
                        </span>
                        <Icon name="arrow" size={17} />
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
          <div className="issue-block">
            <h2>
              <span className="step">2</span>证明类型
            </h2>
            <div className="certificate-options">
              {data.templates.map((item) => (
                <button
                  className={kind === item.kind ? 'selected' : ''}
                  onClick={() => {
                    setKind(item.kind);
                    setCertificate(null);
                    setError('');
                  }}
                  key={item.kind}
                >
                  <Icon name="certificate" size={18} />
                  <span>{item.name}</span>
                  {kind === item.kind && <Icon name="check" size={14} />}
                </button>
              ))}
            </div>
          </div>
          <div className="issue-block">
            <h2>
              <span className="step">3</span>证明信息
            </h2>
            <form
              id="certificate-fields"
              className="certificate-field-form"
              onSubmit={(e) => {
                e.preventDefault();
                void create(false);
              }}
            >
              <label>
                学校名称
                <input
                  type="text"
                  value={values['schoolName'] ?? ''}
                  disabled={!student}
                  required={t.requiredFields.includes('schoolName')}
                  onChange={(e) => change('schoolName', e.target.value)}
                  placeholder="选择学生后自动填入，可为本次证明修改"
                />
              </label>
              <label>
                开具日期
                <DateInput
                  value={issueDate}
                  required
                  onChange={(e) => {
                    setIssueDate(e.target.value);
                    setCertificate(null);
                  }}
                />
              </label>
              {student ? (
                <div className="form-grid">
                  {[...new Set(formFields)].map((key) => (
                    <label
                      key={key}
                      className={
                        [
                          'idNumber',
                          'homeAddress',
                          'travelRoute',
                          'signature',
                          'schoolName',
                        ].includes(key)
                          ? 'span-2'
                          : ''
                      }
                    >
                      {fields[key] ?? key}
                      {['homeAddress', 'travelRoute'].includes(key) && (
                        <span className="manual-tag">本次填写</span>
                      )}
                      {dateFields.has(key) ? (
                        <DateInput
                          value={values[key] ?? ''}
                          onChange={(e) => change(key, e.target.value)}
                          required
                        />
                      ) : (
                        <input
                          type="text"
                          value={values[key] ?? ''}
                          onChange={(e) => change(key, e.target.value)}
                          required
                          placeholder={'填写' + (fields[key] ?? key)}
                        />
                      )}
                    </label>
                  ))}
                </div>
              ) : (
                <p className="no-student-caption">选择学生后自动填入信息。</p>
              )}
              <div className="issue-form-hint">
                <Icon name="info" size={14} />
                <span>此处补充仅用于本次证明，不修改学生档案。</span>
              </div>
            </form>
          </div>
        </div>
        <div className="issue-bottom">
          <Button disabled={busy || !student} onClick={() => void create(false)}>
            {busy ? '正在生成…' : '生成证明'}
          </Button>
          <Button
            icon="print"
            variant="primary"
            disabled={busy || !student}
            onClick={() => (certificate ? printCertificate(certificate) : void create(true))}
          >
            生成并打印
          </Button>
        </div>
      </section>
      <section className="preview-panel">
        <header>
          <div>
            <span className="preview-dot" />
            <strong>证明预览</strong>
            <span className="preview-format">A4</span>
          </div>
          <div>
            <select
              aria-label="预览缩放"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            >
              <option value={0.5}>50%</option>
              <option value={0.68}>适合页面</option>
              <option value={0.85}>85%</option>
              <option value={1}>100%</option>
            </select>
            {certificate?.contentBase64 && (
              <Button
                variant="text"
                icon="download"
                title="下载 Word"
                onClick={() => downloadBase64(certificate.contentBase64!, certificate.fileName)}
              />
            )}
          </div>
        </header>
        <div className="preview-stage">
          {wordError && <ErrorBox error={wordError} />}
          <div className="paper-scale-space" style={{ width: 794 * zoom, minHeight: 1123 * zoom }}>
            <div className="paper-scale" style={{ transform: `scale(${zoom})` }}>
              <Paper
                template={certificate?.template ?? t}
                values={certificate?.fields ?? values}
                contentBase64={certificate?.contentBase64 ?? wordDraft?.contentBase64 ?? null}
              />
            </div>
          </div>
        </div>
        <footer>
          <span>
            <Icon name={certificate ? 'check' : 'edit'} size={14} />
            {certificate ? '已生成 · ' + certificate.summary.number : '待生成'}
          </span>
          <span>
            {t.format === 'docx' && !certificate
              ? 'Word 模板 · 自动填充预览'
              : '打印时使用原始 A4 尺寸'}
          </span>
        </footer>
      </section>
    </div>
  );
}
function History() {
  const [result, setResult] = useState<S['StudentCertificateSearchResult'] | null>(null),
    [query, setQuery] = useState(''),
    [page, setPage] = useState(1),
    [error, setError] = useState(''),
    [current, setCurrent] = useState<Certificate | null>(null),
    [loading, setLoading] = useState(false);
  useEffect(() => {
    const a = new AbortController(),
      timer = setTimeout(() => {
        void api('certificates.search', { keyword: query, page, pageSize: 12 }, a.signal)
          .then((r) => {
            setResult(r);
            setError('');
          })
          .catch((e) => {
            if (!a.signal.aborted) setError(errorText(e));
          });
      }, 200);
    return () => {
      clearTimeout(timer);
      a.abort();
    };
  }, [query, page]);
  async function open(id: string) {
    setLoading(true);
    setError('');
    try {
      setCurrent(await api('certificates.get', { id }));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  }
  return (
    <section className="data-panel">
      <div className="panel-top">
        <div>
          <h2>开具记录</h2>
          <span>保留开具时的学生信息与模板版本</span>
        </div>
        <div className="search-control">
          <Icon name="search" size={17} />
          <input
            aria-label="搜索开具记录"
            placeholder="姓名、学号或证明编号"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>
      <ErrorBox error={error} />
      {!result || loading ? (
        <Loading />
      ) : result.items.length ? (
        <>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>证明编号</th>
                  <th>学生</th>
                  <th>证明类型</th>
                  <th>开具日期</th>
                  <th>经办人</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {result.items.map((r) => (
                  <tr key={r.id}>
                    <td className="mono">{r.number}</td>
                    <td>
                      <strong>{r.studentName}</strong>
                      <small className="mono">{r.studentNumber}</small>
                    </td>
                    <td>{r.templateName}</td>
                    <td>{r.issueDate}</td>
                    <td>{r.createdBy}</td>
                    <td>
                      <button className="text-button" onClick={() => void open(r.id)}>
                        查看 / 打印
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={page} total={result.total} pageSize={12} onChange={setPage} />
        </>
      ) : (
        <Empty title="还没有开具记录" icon="certificate">
          <p>生成的证明会保存在这里，可随时查看和重打。</p>
        </Empty>
      )}
      {current && (
        <Modal
          title={current.summary.templateName}
          subtitle={current.summary.number + ' · ' + current.summary.studentName}
          wide
          onClose={() => setCurrent(null)}
          footer={
            <>
              <span className="footer-left muted">
                {current.summary.createdBy} · {shortDate(current.summary.createdAt)}
              </span>
              {current.contentBase64 && (
                <Button
                  icon="download"
                  onClick={() => downloadBase64(current.contentBase64!, current.fileName)}
                >
                  下载 Word
                </Button>
              )}
              <Button icon="print" variant="primary" onClick={() => printCertificate(current)}>
                打印证明
              </Button>
            </>
          }
        >
          <div className="history-paper">
            <div>
              <Paper
                template={current.template}
                values={current.fields}
                contentBase64={current.contentBase64}
              />
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
