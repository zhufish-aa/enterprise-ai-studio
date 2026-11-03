import { useEffect, useMemo, useState } from 'react';
import { Api, type S } from './api.js';
import { ErrorBanner, Loading } from './components.js';
import { compareFiles, diffLines, type DiffRow, type FileDiff } from './source-diff.js';
import './version-diff.css';

type Snapshot = S['SourceUpload'];
const empty: Snapshot['files'] = [];
const labels = { added: '新增', modified: '修改', deleted: '删除' };
const sourceFiles = (snapshot: Snapshot): Snapshot['files'] => [
  ...snapshot.files,
  { path: 'studio.manifest.json', content: JSON.stringify(snapshot.manifest, null, 2) + '\n' },
];

/** Snapshots remain in this mounted view only; never persist source in browser storage. */
export function VersionDiff({
  api,
  appId,
  versions,
  initialVersion,
}: {
  api: Api;
  appId: string;
  versions: S['StudioVersion'][];
  initialVersion: string;
}) {
  const ordered = useMemo(
    () => versions.filter((v) => v.appId === appId).sort((a, b) => b.version - a.version),
    [versions, appId],
  );
  const initial = ordered.find((v) => v.id === initialVersion) ?? ordered[0];
  const [afterId, setAfterId] = useState(initial?.id ?? '');
  const [beforeId, setBeforeId] = useState(
    ordered.find((v) => v.version < (initial?.version ?? 0))?.id ?? '',
  );
  const [mode, setMode] = useState<'unified' | 'split'>(() =>
    window.matchMedia('(max-width: 760px)').matches ? 'unified' : 'split',
  );
  const [result, setResult] = useState<{ key: string; files: FileDiff[] } | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [path, setPath] = useState('');
  const [search, setSearch] = useState('');
  const requestKey = appId + ':' + beforeId + ':' + afterId;
  useEffect(() => {
    if (!ordered.some((v) => v.id === afterId)) {
      const target = ordered.find((v) => v.id === initialVersion) ?? ordered[0];
      setAfterId(target?.id ?? '');
      setBeforeId(ordered.find((v) => v.version < (target?.version ?? 0))?.id ?? '');
    } else if (beforeId && !ordered.some((v) => v.id === beforeId)) setBeforeId('');
  }, [ordered, initialVersion, afterId, beforeId]);
  useEffect(() => {
    const abort = new AbortController();
    let current = true;
    setResult(null);
    setError('');
    if (!afterId || !ordered.some((v) => v.id === afterId)) return () => abort.abort();
    const read = (id: string) =>
      api.request<Snapshot>('/apps/' + appId + '/versions/' + id + '/source', {
        signal: abort.signal,
      });
    void (async () => {
      try {
        // Even identical versions pass server authorization; no client-only access shortcut.
        const after = await read(afterId);
        const before = beforeId === afterId ? after : beforeId ? await read(beforeId) : null;
        if (!current) return;
        const files = compareFiles(before ? sourceFiles(before) : empty, sourceFiles(after), {
          retainRows: false,
        });
        setResult({ key: requestKey, files });
        setPath((old) => (files.some((f) => f.path === old) ? old : (files[0]?.path ?? '')));
      } catch (e) {
        if (current && !abort.signal.aborted)
          setError(e instanceof Error ? e.message : '无法读取版本源码。');
      }
    })();
    return () => {
      current = false;
      abort.abort();
    };
  }, [api, appId, beforeId, afterId, requestKey, retry, ordered]);
  const files = result?.key === requestKey ? result.files : null;
  const visible = files?.filter((f) => f.path.toLowerCase().includes(search.toLowerCase())) ?? [];
  const selectedSummary = files?.find((f) => f.path === path);
  const selected = useMemo(
    () =>
      selectedSummary
        ? {
            ...selectedSummary,
            ...diffLines(selectedSummary.before ?? '', selectedSummary.after ?? '', {
              maxCells: selectedSummary.coarse ? 0 : 1_000_000,
            }),
          }
        : undefined,
    [selectedSummary],
  );
  const additions = files?.reduce((sum, f) => sum + f.additions, 0) ?? 0;
  const deletions = files?.reduce((sum, f) => sum + f.deletions, 0) ?? 0;
  return (
    <section className="version-diff" aria-label="版本文件差异">
      <header className="vd-heading">
        <div>
          <span className="vd-eyebrow">VERSION DIFF</span>
          <h3>看清每一次改动</h3>
          <p>不可变源码快照 · 只读对比，不改变当前草稿</p>
        </div>
        {files && (
          <div className="vd-total">
            <strong>{files.length}</strong> 个文件 <span className="vd-add">+{additions}</span>
            <span className="vd-delete">−{deletions}</span>
          </div>
        )}
      </header>
      {!ordered.length ? (
        <div className="vd-empty">还没有源码版本。提交第一个版本后，即可查看文件改动。</div>
      ) : (
        <>
          <div className="vd-toolbar">
            <div className="vd-version-selects">
              <label>
                原版本
                <select
                  aria-label="原版本"
                  value={beforeId}
                  onChange={(e) => setBeforeId(e.target.value)}
                >
                  <option value="">空版本 · 所有文件均为新增</option>
                  {ordered.map((v) => (
                    <option key={v.id} value={v.id}>
                      v{v.version} · {v.message || '未填写说明'}
                    </option>
                  ))}
                </select>
              </label>
              <span className="vd-arrow" aria-hidden="true">
                →
              </span>
              <label>
                目标版本
                <select
                  aria-label="目标版本"
                  value={afterId}
                  onChange={(e) => setAfterId(e.target.value)}
                >
                  {ordered.map((v) => (
                    <option key={v.id} value={v.id}>
                      v{v.version} · {v.message || '未填写说明'}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="vd-mode" aria-label="差异视图">
              <button
                type="button"
                aria-pressed={mode === 'unified'}
                onClick={() => setMode('unified')}
              >
                统一
              </button>
              <button
                type="button"
                aria-pressed={mode === 'split'}
                onClick={() => setMode('split')}
              >
                并排
              </button>
            </div>
          </div>
          {error ? (
            <div className="vd-error">
              <ErrorBanner error={error} />
              <button type="button" onClick={() => setRetry((n) => n + 1)}>
                重新加载
              </button>
            </div>
          ) : !files ? (
            <div className="vd-empty" role="status">
              <Loading />
              正在读取两个版本的源码…
            </div>
          ) : !files.length ? (
            <div className="vd-empty">
              <span className="vd-equal">=</span>
              <h4>{beforeId === afterId ? '选择了同一个版本' : '两个版本的文件完全一致'}</h4>
              <p>没有新增、删除或修改的源码。</p>
            </div>
          ) : (
            <div className="vd-workspace">
              <aside className="vd-files" aria-label="变更文件">
                <div className="vd-file-search">
                  <input
                    aria-label="筛选变更文件"
                    placeholder="筛选文件…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="vd-file-list">
                  {visible.map((f) => (
                    <button
                      type="button"
                      key={f.path}
                      className={f.path === path ? 'active' : ''}
                      aria-pressed={f.path === path}
                      onClick={() => setPath(f.path)}
                    >
                      <span className={'vd-status ' + f.status} title={labels[f.status]}>
                        {f.status === 'added' ? 'A' : f.status === 'deleted' ? 'D' : 'M'}
                      </span>
                      <span className="vd-file-path" title={f.path}>
                        {f.path}
                      </span>
                      <span className="vd-file-count">
                        <span className="vd-add">+{f.additions}</span>
                        <span className="vd-delete">−{f.deletions}</span>
                      </span>
                    </button>
                  ))}
                  {!visible.length && <p className="vd-search-empty">没有匹配的文件</p>}
                </div>
              </aside>
              <main className="vd-detail">
                {selected && (
                  <FileChanges key={requestKey + ':' + selected.path} file={selected} mode={mode} />
                )}
              </main>
            </div>
          )}
          <footer className="vd-footnote">
            仅比较文本源码。studio.manifest.json
            为版本清单的格式化视图；换行符和文件末尾换行也计入差异。
          </footer>
        </>
      )}
    </section>
  );
}

type ViewRow = { left: DiffRow | null; right: DiffRow | null };
function splitRows(rows: DiffRow[]): ViewRow[] {
  const result: ViewRow[] = [];
  for (let i = 0; i < rows.length; ) {
    const row = rows[i]!;
    if (row.kind === 'equal') {
      result.push({ left: row, right: row });
      i++;
      continue;
    }
    const deleted: DiffRow[] = [],
      added: DiffRow[] = [];
    while (i < rows.length && rows[i]!.kind !== 'equal') {
      const change = rows[i++]!;
      (change.kind === 'delete' ? deleted : added).push(change);
    }
    for (let n = 0; n < Math.max(deleted.length, added.length); n++)
      result.push({ left: deleted[n] ?? null, right: added[n] ?? null });
  }
  return result;
}
function LineText({ row }: { row: DiffRow }) {
  return (
    <>
      <span>{row.text || ' '}</span>
      {row.ending === 'none' && <span className="vd-eol">↵ 文件末尾无换行</span>}
      {row.ending === 'crlf' && row.kind !== 'equal' && <span className="vd-eol">CRLF</span>}
    </>
  );
}
function FileChanges({ file, mode }: { file: FileDiff; mode: 'unified' | 'split' }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [limit, setLimit] = useState(800);
  const rows =
    mode === 'split'
      ? splitRows(file.rows)
      : file.rows.map((row) => ({
          left: row.kind === 'add' ? null : row,
          right: row.kind === 'delete' ? null : row,
        }));
  const display: (
    | { type: 'row'; index: number; value: ViewRow }
    | { type: 'fold'; index: number; count: number }
  )[] = [];
  for (let i = 0; i < rows.length; ) {
    if (rows[i]?.left?.kind !== 'equal') {
      display.push({ type: 'row', index: i, value: rows[i++]! });
      continue;
    }
    const start = i;
    while (i < rows.length && rows[i]?.left?.kind === 'equal') i++;
    const end = i,
      head = start === 0 ? 0 : 3,
      tail = end === rows.length ? 0 : 3;
    if (end - start <= head + tail + 2 || expanded.has(start)) {
      for (let n = start; n < end; n++) display.push({ type: 'row', index: n, value: rows[n]! });
    } else {
      for (let n = start; n < start + head; n++)
        display.push({ type: 'row', index: n, value: rows[n]! });
      display.push({ type: 'fold', index: start, count: end - start - head - tail });
      for (let n = end - tail; n < end; n++)
        display.push({ type: 'row', index: n, value: rows[n]! });
    }
  }
  return (
    <>
      <div className="vd-file-heading">
        <div>
          <span className={'vd-status ' + file.status}>{labels[file.status]}</span>
          <strong>{file.path}</strong>
        </div>
        <span>
          <span className="vd-add">+{file.additions}</span>{' '}
          <span className="vd-delete">−{file.deletions}</span>
        </span>
      </div>
      {file.coarse && (
        <p className="vd-notice">
          为保持大版本对比流畅，此文件未匹配片段按整段替换展示；增删统计对应展示行数，不保证最小编辑行数，内容未省略。
        </p>
      )}
      {file.rows.length === 0 ? (
        <div className="vd-empty">{file.status === 'added' ? '新增空文件' : '删除空文件'}</div>
      ) : (
        <>
          {mode === 'split' && (
            <div className="vd-pane-labels">
              <span>原版本</span>
              <span>目标版本</span>
            </div>
          )}
          <div
            className={'vd-code ' + mode}
            role="region"
            aria-label={file.path + ' 逐行差异'}
            tabIndex={0}
          >
            {display.slice(0, limit).map((item) =>
              item.type === 'fold' ? (
                <button
                  className="vd-fold"
                  type="button"
                  key={'fold' + item.index}
                  onClick={() => {
                    setExpanded((old) => new Set(old).add(item.index));
                    setLimit((n) => n + 800);
                  }}
                >
                  展开 {item.count} 行未改动内容
                </button>
              ) : mode === 'split' ? (
                <div className="vd-split-row" key={item.index}>
                  {[item.value.left, item.value.right].map((row, side) => (
                    <div key={side} className={'vd-cell ' + (row?.kind ?? 'blank')}>
                      <span className="vd-line-number">
                        {side === 0 ? row?.oldLine : row?.newLine}
                      </span>
                      <span className="vd-sign">
                        {row?.kind === 'add' ? '+' : row?.kind === 'delete' ? '−' : ' '}
                      </span>
                      <code>{row && <LineText row={row} />}</code>
                    </div>
                  ))}
                </div>
              ) : (
                (() => {
                  const row = item.value.left ?? item.value.right!;
                  return (
                    <div className={'vd-unified-row ' + row.kind} key={item.index}>
                      <span className="vd-line-number">{row.oldLine}</span>
                      <span className="vd-line-number">{row.newLine}</span>
                      <span className="vd-sign">
                        {row.kind === 'add' ? '+' : row.kind === 'delete' ? '−' : ' '}
                      </span>
                      <code>
                        <LineText row={row} />
                      </code>
                    </div>
                  );
                })()
              ),
            )}
          </div>
          {display.length > limit && (
            <button className="vd-more" type="button" onClick={() => setLimit((n) => n + 800)}>
              继续显示后续行 · 还有 {display.length - limit} 行
            </button>
          )}
        </>
      )}
    </>
  );
}
