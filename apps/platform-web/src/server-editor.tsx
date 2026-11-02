import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { Api, type S } from './api.js';
import { Button, ErrorBanner, Loading } from './components.js';
import { Icon } from './icons.js';
import { ServerFileTree, SourceFileIcon } from './server-file-tree.js';
import './server-editor.css';

const SourceCodeEditor = lazy(() => import('./source-code-editor.js'));

type FileBuffer = { content: string; saved: string };

export function ServerEditor({
  api,
  appId,
  versions,
  onCommitted,
}: {
  api: Api;
  appId: string;
  versions: S['StudioVersion'][];
  onCommitted: (v: S['StudioVersion']) => void;
}) {
  const [workspace, setWorkspace] = useState<S['ServerWorkspace'] | null>(null);
  const [path, setPath] = useState('');
  const [buffers, setBuffers] = useState<Record<string, FileBuffer>>({});
  const [newPath, setNewPath] = useState('src/main.tsx');
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('服务器源码更新');
  const [version, setVersion] = useState('');
  const [info, setInfo] = useState('');
  const base = '/apps/' + appId + '/workspace';
  const buffer = buffers[path];
  const content = buffer?.content ?? '';
  const dirty = !!buffer && buffer.content !== buffer.saved;
  const modifiedPaths = useMemo(
    () =>
      new Set(
        Object.entries(buffers)
          .filter(([, file]) => file.content !== file.saved)
          .map(([name]) => name),
      ),
    [buffers],
  );
  const hasChanges = modifiedPaths.size > 0;
  const fail = (e: unknown) => setError(e instanceof Error ? e.message : '操作未完成。');

  useEffect(() => {
    const abort = new AbortController();
    void api
      .request<S['ServerWorkspace']>(base, { signal: abort.signal })
      .then(setWorkspace)
      .catch((e) => {
        if (!abort.signal.aborted) fail(e);
      });
    return () => abort.abort();
  }, [api, base]);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    setInfo('');
    try {
      await fn();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  function open(name: string) {
    if (buffers[name]) {
      setPath(name);
      return;
    }
    void run(async () => {
      const file = await api.request<S['ServerWorkspaceFile']>(base + '/read', {
        method: 'POST',
        body: { path: name },
      });
      // A newer read must not advance the revision used to save older buffers.
      setPath(file.path);
      setBuffers((current) => ({
        ...current,
        [file.path]: { content: file.content, saved: file.content },
      }));
      if (workspace && file.revision !== workspace.revision)
        setError(
          '服务器草稿已有更新。当前编辑内容会保留；请核对最新文件后合并修改，直接保存会被拒绝。',
        );
    });
  }

  const save = (all = false) =>
    run(async () => {
      if (!workspace || (!all && !path)) return;
      const names = all ? [...modifiedPaths] : [path];
      const files = names.map((name) => ({ path: name, content: buffers[name]!.content }));
      const next = await api.request<S['ServerWorkspace']>(base + '/write', {
        method: 'POST',
        body: { revision: workspace.revision, files },
      });
      setWorkspace(next);
      setBuffers((current) => {
        const updated = { ...current };
        for (const file of files)
          updated[file.path] = { content: file.content, saved: file.content };
        return updated;
      });
      setInfo(all ? '全部修改已保存到服务器。' : '文件已保存到服务器。');
    });

  const create = () =>
    run(async () => {
      if (!workspace || !newPath.trim()) return;
      const name = newPath.trim();
      if (workspace.files.some((file) => file.path.toLowerCase() === name.toLowerCase()))
        throw new Error('该文件已存在，请在左侧打开。');
      const value =
        name === 'studio.manifest.json'
          ? JSON.stringify(
              { schemaVersion: '1.0', entrypoint: 'src/main.tsx', datasetRefs: [], queries: [] },
              null,
              2,
            )
          : '';
      setWorkspace(
        await api.request(base + '/write', {
          method: 'POST',
          body: { revision: workspace.revision, files: [{ path: name, content: value }] },
        }),
      );
      setPath(name);
      setBuffers((current) => ({ ...current, [name]: { content: value, saved: value } }));
      setCreating(false);
    });

  const remove = () =>
    run(async () => {
      if (!workspace || !path || dirty) return;
      setWorkspace(
        await api.request(base + '/remove', {
          method: 'POST',
          body: { revision: workspace.revision, paths: [path] },
        }),
      );
      setBuffers((current) => {
        const next = { ...current };
        delete next[path];
        return next;
      });
      setPath('');
      setInfo('文件已从草稿移除，历史版本保留。');
    });

  const reload = () =>
    run(async () => {
      if (hasChanges) return;
      setWorkspace(await api.request(base));
      setBuffers({});
      setPath('');
      setInfo('已读取最新服务器文件。');
    });

  const checkout = () =>
    run(async () => {
      if (!workspace || !version || hasChanges) return;
      setWorkspace(
        await api.request(base + '/checkout', {
          method: 'POST',
          body: { revision: workspace.revision, versionId: version },
        }),
      );
      setPath('');
      setBuffers({});
      setInfo('历史源码已载入服务器草稿。');
    });

  const commit = () =>
    run(async () => {
      if (!workspace || hasChanges) return;
      const result = await api.request<S['ServerWorkspaceCommit']>(base + '/commit', {
        method: 'POST',
        body: { revision: workspace.revision, message },
      });
      setWorkspace(result.workspace);
      onCommitted(result.version);
      setInfo('已提交源码版本 v' + result.version.version + '，现在可以构建预览。');
    });

  return (
    <div className="server-editor">
      <header>
        <div>
          <h2>服务器源码</h2>
          <p>浏览项目文件，直接查看和编辑服务器上的源码。</p>
        </div>
        <span className="server-draft">
          <i />
          草稿 r{workspace?.revision ?? 0}
        </span>
      </header>
      {error && <ErrorBanner error={error} />}
      {info && (
        <p className="studio-info" role="status">
          {info}
        </p>
      )}
      {!workspace ? (
        <Loading />
      ) : (
        <>
          <div className="server-editor-tools">
            <label>
              历史版本
              <select
                aria-label="载入服务器源码版本"
                value={version}
                disabled={busy || hasChanges}
                onChange={(event) => setVersion(event.target.value)}
              >
                <option value="">选择已有源码版本</option>
                {versions.map((item) => (
                  <option key={item.id} value={item.id}>
                    v{item.version} · {item.message}
                  </option>
                ))}
              </select>
            </label>
            <Button disabled={busy || hasChanges || !version} onClick={() => void checkout()}>
              载入为草稿
            </Button>
            <small>载入会替换当前草稿；已提交版本不变。</small>
          </div>
          <div className="server-editor-body">
            <aside aria-label="文件资源管理器">
              <ServerFileTree
                files={workspace.files}
                selectedPath={path}
                modifiedPaths={modifiedPaths}
                busy={busy}
                onOpen={open}
              />
              {creating && (
                <form
                  className="server-new-file"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void create();
                  }}
                >
                  <label htmlFor="server-new-path">新文件路径</label>
                  <div>
                    <input
                      id="server-new-path"
                      aria-label="新文件路径"
                      value={newPath}
                      onChange={(event) => setNewPath(event.target.value)}
                      placeholder="src/components/Chart.tsx"
                      disabled={busy}
                      autoFocus
                    />
                    <button
                      type="button"
                      title="取消新建"
                      aria-label="取消新建文件"
                      onClick={() => setCreating(false)}
                    >
                      <Icon name="x" size={14} />
                    </button>
                  </div>
                  <Button type="submit" disabled={busy || !newPath.trim()}>
                    创建文件
                  </Button>
                </form>
              )}
              <div className="source-tree-actions">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setCreating((value) => !value)}
                >
                  <Icon name="plus" size={14} />
                  新建文件
                </button>
                <button
                  type="button"
                  aria-label="刷新服务器文件"
                  title={hasChanges ? '保存修改后刷新文件列表' : '刷新服务器文件'}
                  disabled={busy || hasChanges}
                  onClick={() => void reload()}
                >
                  <Icon name="refresh" size={14} />
                </button>
              </div>
            </aside>
            <section className="server-code-panel" aria-label="源码编辑器">
              <div className="server-file-heading">
                <div className="server-file-location">
                  {path ? (
                    <>
                      <SourceFileIcon path={path} />
                      <div className="server-breadcrumb" title={path}>
                        {path.split('/').map((part, index) => (
                          <span key={index}>
                            {index > 0 && <Icon name="chevron" size={12} />}
                            <span>{part}</span>
                          </span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <span>源码预览</span>
                  )}
                </div>
                {dirty && <span className="server-unsaved">未保存</span>}
                {modifiedPaths.size > 1 && (
                  <Button disabled={busy} onClick={() => void save(true)}>
                    全部保存
                  </Button>
                )}
                <Button
                  variant="quiet"
                  icon="trash"
                  aria-label="删除当前文件"
                  title={dirty ? '请先保存当前文件的修改' : '删除当前文件'}
                  disabled={busy || !path || dirty}
                  onClick={() => void remove()}
                />
                <Button disabled={busy || !path || !dirty} onClick={() => void save()}>
                  保存文件
                </Button>
              </div>
              {path ? (
                <Suspense
                  fallback={
                    <div className="server-code-loading" role="status">
                      正在加载源码编辑器…
                    </div>
                  }
                >
                  <SourceCodeEditor
                    key={path}
                    path={path}
                    value={content}
                    onChange={(value) =>
                      setBuffers((current) => ({
                        ...current,
                        [path]: { content: value, saved: current[path]?.saved ?? '' },
                      }))
                    }
                    disabled={busy}
                    onSave={() => {
                      if (dirty && !busy) void save();
                    }}
                  />
                </Suspense>
              ) : (
                <div className="server-editor-empty">
                  <Icon name="code" size={30} />
                  <h3>从一个文件开始</h3>
                  <p>展开左侧文件夹，选择文件查看源码。</p>
                  <span>文件保存在服务器，Harness 的修改也会出现在这里。</span>
                </div>
              )}
              <div className="server-code-status">
                <span>
                  {path
                    ? path.endsWith('.tsx')
                      ? 'TypeScript React'
                      : path.endsWith('.ts')
                        ? 'TypeScript'
                        : path.endsWith('.css')
                          ? 'CSS'
                          : path.endsWith('.json')
                            ? 'JSON'
                            : path.endsWith('.md')
                              ? 'Markdown'
                              : path.endsWith('.jsx')
                                ? 'JavaScript React'
                                : /\.(js|mjs|cjs)$/.test(path)
                                  ? 'JavaScript'
                                  : '文本'
                    : '服务器工作区'}
                </span>
                <span>
                  {path ? content.split('\n').length + ' 行 · UTF-8' : '选择文件以查看内容'}
                </span>
              </div>
            </section>
          </div>
          <footer>
            <label>
              版本说明
              <input
                aria-label="服务器源码版本说明"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={500}
              />
            </label>
            {hasChanges && (
              <span className="server-unsaved-count">{modifiedPaths.size} 个文件尚未保存</span>
            )}
            <Button
              variant="primary"
              disabled={busy || hasChanges || !workspace.files.length || !message.trim()}
              onClick={() => void commit()}
            >
              {busy ? '正在处理…' : '提交源码版本'}
            </Button>
          </footer>
          <p className="server-editor-help">
            切换文件会保留未保存的内容；保存后再提交版本，即可构建测试预览。多人同时修改时，服务器会检查草稿版本，避免覆盖更新。
          </p>
        </>
      )}
    </div>
  );
}
