import {
  PreviewQueryQueue,
  failureInfo,
  formatFailure,
  studentCenterActions,
  type FailureInfo,
  type StudentCenterAction,
} from '@eas/platform-sdk';
import { studentCenterBridge } from './student-center-bridge.js';
import { ServerEditor } from './server-editor.js';
import { VersionDiff } from './version-diff.js';
import { SiteSharingDialog } from './site-sharing.js';
import { SiteDataSources, SiteBackendRuntime } from './site-runtime.js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Api, ApiError, type S } from './api.js';
import { Button, Dialog, Empty, ErrorBanner, Loading, formatDate } from './components.js';
import { Icon } from './icons.js';
import './studio.css';
export function PreviewFrame({
  api,
  preview,
  shareId,
}: {
  api: Api;
  shareId?: string;
  preview: S['StudioPreview'];
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [failures, setFailures] = useState<Record<string, FailureInfo>>({}),
    [detailsOpen, setDetailsOpen] = useState(true),
    [errorCopied, setErrorCopied] = useState(false);
  useEffect(() => {
    setFailures({});
    setDetailsOpen(true);
    const queue = new PreviewQueryQueue();
    let disposed = false;
    const businessRequests = new Map<string, AbortController>();
    const business = studentCenterBridge(preview.appId, preview.versionId);
    const receive = (event: MessageEvent) => {
      if (
        event.source !== frame.current?.contentWindow ||
        event.origin !== 'null' ||
        !event.data ||
        typeof event.data !== 'object'
      )
        return;
      const data = event.data as Record<string, unknown>,
        id = data['id'];
      if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/i.test(id)) return;
      if (data['type'] === 'site.cancel') {
        businessRequests.get(id)?.abort();
        return;
      }
      if (data['type'] === 'site.request') {
        if (businessRequests.has(id)) return;
        const send = (body: object) => {
          if (!disposed)
            frame.current?.contentWindow?.postMessage({ type: 'site.result', id, ...body }, '*');
        };
        if (!preview.manifest.runtime || preview.environment !== 'test') {
          send({ error: 'SITE_BACKEND_REQUIRED', message: '此版本尚未配置独立站点后端。' });
          return;
        }
        const controller = new AbortController();
        businessRequests.set(id, controller);
        void api
          .request<S['SiteProxyResponse']>('/site-apps/' + preview.appId + '/request', {
            method: 'POST',
            body: {
              versionId: preview.versionId,
              method: data['method'],
              path: data['path'],
              body: data['body'],
              headers: data['headers'],
            },
            signal: controller.signal,
          })
          .then((response) => send({ response }))
          .catch((e) =>
            send({
              error: 'SITE_BACKEND_UNAVAILABLE',
              message: e instanceof Error ? e.message : '站点后端不可用。',
            }),
          )
          .finally(() => businessRequests.delete(id));
        return;
      }
      if (data['type'] === 'student-center.request') {
        if (businessRequests.has(id)) return;
        const send = (body: object) => {
          if (!disposed)
            frame.current?.contentWindow?.postMessage(
              { type: 'student-center.result', id, ...body },
              '*',
            );
        };
        if (
          preview.environment !== 'test' ||
          !preview.manifest.capabilities?.includes('student-center') ||
          !studentCenterActions.some((action) => action === data['action']) ||
          Object.keys(data).some((k) => !['id', 'type', 'action', 'payload'].includes(k))
        ) {
          send({
            error: 'SITE_CAPABILITY_REQUIRED',
            diagnostic: {
              ...failureInfo('FORBIDDEN'),
              message: '此版本没有可用的学生事务工作台能力。',
            },
          });
          return;
        }
        const controller = new AbortController();
        businessRequests.set(id, controller);
        void business(data['action'] as StudentCenterAction, data['payload'], id, controller.signal)
          .then((result) => send({ result }))
          .catch((error) =>
            send({
              error: error instanceof ApiError ? error.code : 'STUDENT_SERVICE_UNAVAILABLE',
              diagnostic:
                error instanceof ApiError
                  ? error.diagnostic
                  : {
                      ...failureInfo('DEPENDENCY_UNAVAILABLE'),
                      message: '无法连接学生事务服务，请检查后台连接。',
                    },
            }),
          )
          .finally(() => businessRequests.delete(id));
        return;
      }
      if (data['type'] === 'studio.cancel') {
        queue.cancel(id);
        return;
      }
      if (data['type'] !== 'studio.query' || queue.has(id)) return;
      const send = (body: object) => {
        if (!disposed)
          frame.current?.contentWindow?.postMessage({ type: 'studio.result', id, ...body }, '*');
      };
      const reject = (
        code: string,
        diagnostic = failureInfo(code, { operation: '查询 ' + String(data['queryKey']) }),
      ) => {
        const bound = preview.manifest.queries.find((query) => query.key === data['queryKey']);
        const info =
          code === 'INVALID_FILTER_BINDING' && !diagnostic.details?.length
            ? {
                ...diagnostic,
                details: [
                  {
                    field: 'timeRange.fieldKey',
                    reason: bound?.query.timeRange
                      ? '查询 ' +
                        bound.key +
                        ' 已登记的日期字段为 ' +
                        bound.query.timeRange.fieldKey +
                        '，页面传入的字段不一致。'
                      : '查询 ' +
                        String(data['queryKey']) +
                        ' 未在 studio.manifest.json 登记 timeRange 日期筛选；请补充日期字段、提交新版本并重新构建。',
                  },
                ],
              }
            : diagnostic;
        if (!disposed && code !== 'QUERY_CANCELLED') {
          setFailures((current) => ({ ...current, [String(data['queryKey'])]: info }));
          setDetailsOpen(true);
          setErrorCopied(false);
        }
        send({ error: code, diagnostic: info });
      };
      if (
        !preview.manifest.queries.some((q) => q.key === data['queryKey']) ||
        Object.keys(data).some(
          (k) => !['id', 'type', 'queryKey', 'filters', 'timeRange'].includes(k),
        )
      ) {
        reject('INVALID_QUERY_BINDING');
        return;
      }
      const accepted = queue.enqueue(id, async (signal) => {
        if (!disposed)
          setFailures((current) => {
            const next = { ...current };
            delete next[String(data['queryKey'])];
            return next;
          });
        let jobId: string | undefined;
        try {
          signal.throwIfAborted();
          let job = await api.request<S['QueryJob']>(
            preview.environment === 'production'
              ? '/runtime/apps/' + preview.appId + '/bound-queries'
              : shareId
                ? '/site-shares/' + shareId + '/queries'
                : '/apps/' + preview.appId + '/preview/' + preview.versionId + '/queries',
            {
              method: 'POST',
              body: {
                queryKey: data['queryKey'],
                filters: data['filters'],
                ...(data['timeRange'] ? { timeRange: data['timeRange'] } : {}),
              },
            },
          );
          jobId = job.id;
          while (!['succeeded', 'failed', 'cancelled'].includes(job.status)) {
            signal.throwIfAborted();
            await new Promise((resolve) => setTimeout(resolve, 200));
            job = await api.request<S['QueryJob']>('/query-jobs/' + job.id, { signal });
          }
          signal.throwIfAborted();
          if (job.status === 'succeeded' && job.result) send({ result: job.result });
          else {
            const code = job.failureCode ?? 'QUERY_TIMEOUT';
            reject(
              code,
              failureInfo(code, {
                operation: '查询 ' + String(data['queryKey']),
                traceId: job.traceId,
              }),
            );
          }
        } catch (error) {
          if (error instanceof ApiError)
            reject(error.code, {
              ...error.diagnostic,
              operation: '查询 ' + String(data['queryKey']),
            });
          else reject(signal.aborted ? 'QUERY_CANCELLED' : 'QUERY_FAILED');
        } finally {
          if (signal.aborted && jobId)
            void api
              .request('/query-jobs/' + jobId + '/cancel', { method: 'POST' })
              .catch(() => {});
        }
      });
      if (!accepted) reject('PREVIEW_QUEUE_FULL');
    };
    const pending = setInterval(() => {
      for (const id of queue.pendingIds())
        frame.current?.contentWindow?.postMessage({ type: 'studio.pending', id }, '*');
    }, 5000);
    window.addEventListener('message', receive);
    return () => {
      disposed = true;
      clearInterval(pending);
      window.removeEventListener('message', receive);
      queue.close();
      for (const controller of businessRequests.values()) controller.abort();
    };
  }, [api, preview, shareId]);
  const errors = Object.values(failures);
  return (
    <div className="preview-runtime">
      <iframe
        ref={frame}
        title="应用真实测试预览"
        name={
          'eas-runtime:' +
          JSON.stringify({
            environment: preview.environment,
            appId: preview.appId,
            versionId: preview.versionId,
          })
        }
        sandbox={
          preview.manifest.runtime || preview.manifest.capabilities?.includes('student-center')
            ? 'allow-scripts allow-forms allow-modals allow-downloads'
            : 'allow-scripts allow-forms'
        }
        referrerPolicy="no-referrer"
        srcDoc={preview.html}
        className="studio-preview-frame"
      />
      {errors.length > 0 && (
        <aside
          className={'preview-query-diagnostics' + (detailsOpen ? '' : ' collapsed')}
          aria-label="查询错误详情"
          role="alert"
        >
          <header>
            <strong>{errors.length} 项查询未完成</strong>
            <button type="button" onClick={() => setDetailsOpen((value) => !value)}>
              {detailsOpen ? '收起详情' : '查看原因'}
            </button>
          </header>
          {detailsOpen && (
            <>
              <div>
                {errors.map((info) => (
                  <article key={info.operation}>
                    <pre>{formatFailure(info)}</pre>
                  </article>
                ))}
              </div>
              <footer>
                <button
                  type="button"
                  onClick={() =>
                    void navigator.clipboard
                      .writeText(errors.map(formatFailure).join('\n\n'))
                      .then(() => setErrorCopied(true))
                      .catch(() => setErrorCopied(false))
                  }
                >
                  {errorCopied ? '已复制' : '复制全部错误信息'}
                </button>
                <span>由平台直接记录，适用于当前和历史站点版本</span>
              </footer>
            </>
          )}
        </aside>
      )}
    </div>
  );
}
export function StudioPage({
  api,
  datasets,
  canDevelop,
}: {
  api: Api;
  datasets: S['Dataset'][];
  canDevelop: boolean;
}) {
  const [apps, setApps] = useState<S['StudioApp'][]>([]),
    [selected, setSelected] = useState(new URLSearchParams(location.search).get('app') ?? ''),
    [versions, setVersions] = useState<S['StudioVersion'][]>([]),
    [version, setVersion] = useState(new URLSearchParams(location.search).get('version') ?? ''),
    [preview, setPreview] = useState<S['StudioPreview'] | null>(null),
    [error, setError] = useState(''),
    [previewLoading, setPreviewLoading] = useState(false),
    [building, setBuilding] = useState<S['StudioBuild'] | null>(null),
    [tab, setTab] = useState<'preview' | 'versions' | 'config' | 'source' | 'sources' | 'backend'>(
      new URLSearchParams(location.search).get('tab') === 'source' ? 'source' : 'preview',
    ),
    [create, setCreate] = useState(false),
    [prompt, setPrompt] = useState(
      '生成最近 30 天销售趋势、区域销售排名、订单总数和产品销售占比，支持日期和区域筛选。',
    ),
    [copied, setCopied] = useState(false),
    [configText, setConfigText] = useState(''),
    [busy, setBusy] = useState(false),
    [reportVersions, setReportVersions] = useState<S['StudioReportVersion'][]>([]),
    [info, setInfo] = useState(''),
    [sharing, setSharing] = useState(false);
  const current = apps.find((a) => a.id === selected),
    v = versions.find((v) => v.id === version),
    generation = useRef(0);
  const failure = (e: unknown) => setError(e instanceof Error ? e.message : 'REQUEST_FAILED');
  const reload = useCallback(async () => {
    const list = await api.request<S['StudioAppPage']>('/apps');
    setApps(list.items);
    setSelected((id) => (list.items.some((a) => a.id === id) ? id : (list.items[0]?.id ?? '')));
  }, [api]);
  useEffect(() => {
    void reload().catch(failure);
  }, [reload]);
  useEffect(() => {
    const abort = new AbortController();
    setPreview(null);
    setVersions([]);
    if (selected)
      void api
        .request<S['StudioVersionPage']>('/apps/' + selected + '/versions', {
          signal: abort.signal,
        })
        .then((r) => {
          setVersions(r.items);
          setVersion((id) => (r.items.some((v) => v.id === id) ? id : (r.items[0]?.id ?? '')));
        })
        .catch((e) => {
          if (!abort.signal.aborted) failure(e);
        });
    return () => abort.abort();
  }, [api, selected]);
  const loadPreview = useCallback(async () => {
    if (!selected || !version) return;
    const n = ++generation.current;
    setPreview(null);
    setPreviewLoading(true);
    try {
      const p = await api.request<S['StudioPreview']>('/apps/' + selected + '/preview/' + version);
      if (n === generation.current) setPreview(p);
    } catch (e) {
      if (n === generation.current) failure(e);
    } finally {
      if (n === generation.current) setPreviewLoading(false);
    }
  }, [api, selected, version]);
  useEffect(() => {
    setError('');
    setBuilding(null);
    setInfo('');
    setConfigText(v?.manifest.report ? JSON.stringify(v.manifest.report, null, 2) : '');
    void loadPreview();
    return () => {
      generation.current++;
    };
  }, [loadPreview, v]);
  useEffect(() => {
    const abort = new AbortController();
    setReportVersions([]);
    if (v?.manifest.report)
      void api
        .request<S['StudioReportVersionPage']>(
          '/reports/' + v.manifest.report.reportId + '/versions',
          { signal: abort.signal },
        )
        .then((r) => setReportVersions(r.items))
        .catch(() => {});
    return () => abort.abort();
  }, [api, v]);
  async function build() {
    if (!v) return;
    setBusy(true);
    setError('');
    try {
      let b = await api.request<S['StudioBuild']>('/app-versions/' + v.id + '/builds', {
        method: 'POST',
      });
      setBuilding(b);
      for (let n = 0; n < 160 && !['succeeded', 'failed', 'cancelled'].includes(b.status); n++) {
        await new Promise((r) => setTimeout(r, 250));
        b = await api.request('/build-jobs/' + b.id);
        setBuilding(b);
      }
      if (b.status === 'succeeded') {
        setTab('preview');
        await loadPreview();
      } else setError(b.failureCode ?? 'BUILD_TIMEOUT');
    } catch (e) {
      failure(e);
    } finally {
      setBusy(false);
    }
  }
  async function restore(id: string) {
    setBusy(true);
    try {
      const restored = await api.request<S['StudioVersion']>('/apps/' + selected + '/restore', {
        method: 'POST',
        body: { versionId: id, message: '恢复草稿：从历史版本创建新版本' },
      });
      setVersions((old) => [restored, ...old]);
      setVersion(restored.id);
      setInfo('已创建新草稿版本，重新构建后可预览。');
    } catch (e) {
      failure(e);
    } finally {
      setBusy(false);
    }
  }
  async function saveConfig() {
    setBusy(true);
    setError('');
    try {
      const config: unknown = JSON.parse(configText);
      const id = v?.manifest.report?.reportId;
      if (!id) throw new Error('此源码版本没有关联报表。');
      await api.request('/reports/' + id + '/versions', { method: 'POST', body: { config } });
      const r = await api.request<S['StudioReportVersionPage']>('/reports/' + id + '/versions');
      setReportVersions(r.items);
      setInfo('报表定义已保存为独立历史版本。请让 Harness 同步到源码并提交新应用版本后预览。');
    } catch (e) {
      failure(e instanceof SyntaxError ? new Error('JSON 格式无效，请修复后保存。') : e);
    } finally {
      setBusy(false);
    }
  }
  const instruction = `先加载 enterprise-sites Skill，通过企业插件的服务器工作区工具开发。\n${selected ? `继续修改已有应用 ${selected}（${current?.name}），使用 enterprise_workspace_list/read/edit，不创建无关项目。` : '先查询授权测试数据集，然后创建应用。'}\n需求：${prompt}\n在服务器创建或修改 React/TypeScript/ECharts 源码和 studio.manifest.json；通过 @eas/platform-sdk/runtime 查询真实 TEST 数据。使用 enterprise_workspace_commit 提交新版本，再 build/status/preview。无需本地工作区或上传确认。需要上线时查询发布选项，在申请中指定审批人后提交，审批与正式部署由负责人在门户完成。`;
  return (
    <div className="studio-page">
      <div className="studio-project-toolbar">
        <div className="studio-project-strip" role="group" aria-label="应用切换">
          {apps.map((a) => (
            <button
              className={a.id === selected ? 'selected' : ''}
              key={a.id}
              aria-pressed={a.id === selected}
              onClick={() => {
                setSelected(a.id);
                setVersion('');
              }}
            >
              <span className="studio-app-mark">
                <Icon name={a.type === 'REPORT' ? 'chart' : 'code'} size={20} />
              </span>
              <span>
                <strong>{a.name}</strong>
                <small>
                  {a.type === 'REPORT' ? '数据报表' : '业务网站'} ·{' '}
                  {a.sharingVisibility === 'public'
                    ? '对外公开'
                    : a.sharingVisibility === 'organization'
                      ? '组织内公开'
                      : '私有'}{' '}
                  · TEST
                </small>
              </span>
              <Icon name="chevron" size={13} />
            </button>
          ))}
        </div>
        <div className="studio-project-actions">
          <Button icon="refresh" onClick={() => void reload().catch(failure)}>
            刷新
          </Button>
          {canDevelop && (
            <Button icon="plus" variant="primary" onClick={() => setCreate(true)}>
              新建应用
            </Button>
          )}
        </div>
      </div>
      {error && <ErrorBanner error={error} />}
      {info && (
        <p className="studio-info" role="status">
          {info}
        </p>
      )}
      {!current ? (
        <Empty
          title="从一个业务需求开始"
          description="选择授权数据集，把需求交给 Harness，在这里管理源码版本与真实测试预览。"
        />
      ) : (
        <div className="studio-workspace">
          <section className="studio-canvas">
            <div className="studio-canvas-toolbar">
              <div className="studio-tabs">
                {(
                  [
                    'preview',
                    'versions',
                    'config',
                    ...(canDevelop
                      ? ([
                          'source',
                          ...(current.type === 'SITE' ? (['sources', 'backend'] as const) : []),
                        ] as const)
                      : []),
                  ] as const
                ).map((t) => (
                  <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
                    {t === 'preview'
                      ? '测试预览'
                      : t === 'versions'
                        ? '版本记录'
                        : t === 'source'
                          ? '服务器源码'
                          : t === 'sources'
                            ? '站点数据源'
                            : t === 'backend'
                              ? '后端运行'
                              : '报表定义'}
                  </button>
                ))}
              </div>
              <div>
                <span className="studio-test-pill">TEST</span>
                <select
                  aria-label="源码版本"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                >
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      v{v.version} · {v.message.slice(0, 18)}
                    </option>
                  ))}
                </select>
                <Button onClick={() => setSharing(true)}>分享</Button>
                {canDevelop && (
                  <Button icon="code" disabled={busy || !v} onClick={() => void build()}>
                    {busy ? '构建中…' : '构建预览'}
                  </Button>
                )}
              </div>
            </div>
            {tab === 'sources' && canDevelop ? (
              <SiteDataSources key={selected} api={api} appId={selected} />
            ) : tab === 'backend' && canDevelop ? (
              <SiteBackendRuntime
                key={selected}
                api={api}
                appId={selected}
                versionId={version}
                onActivated={() => void loadPreview()}
              />
            ) : tab === 'source' && canDevelop ? (
              <ServerEditor
                key={selected}
                api={api}
                appId={selected}
                versions={versions}
                onCommitted={(item) => {
                  setVersions((old) => [item, ...old]);
                  setVersion(item.id);
                }}
              />
            ) : tab === 'preview' ? (
              previewLoading ? (
                <div className="studio-preview-empty">
                  <Loading />
                </div>
              ) : preview ? (
                <PreviewFrame key={preview.buildId} api={api} preview={preview} />
              ) : (
                <div className="studio-preview-empty">
                  <Icon name="code" size={32} />
                  <h2>{v ? '准备好，构建你的下一个版本' : '等待第一个源码版本'}</h2>
                  <p>
                    {v
                      ? '平台使用固定编译配置生成独立测试预览。'
                      : '在 Harness 中直接编写服务器源码，或打开“服务器源码”开始编辑。'}
                  </p>
                  {v && canDevelop && (
                    <Button variant="primary" disabled={busy} onClick={() => void build()}>
                      构建此版本
                    </Button>
                  )}
                </div>
              )
            ) : tab === 'versions' ? (
              <div className="studio-history">
                {canDevelop && (
                  <VersionDiff
                    key={selected + (versions.length ? ':ready' : ':empty')}
                    api={api}
                    appId={selected}
                    versions={versions}
                    initialVersion={version}
                  />
                )}
                {versions.map((item) => (
                  <article key={item.id}>
                    <span className="studio-version-number">v{item.version}</span>
                    <div>
                      <strong>{item.message}</strong>
                      <small>
                        {formatDate(item.createdAt)}
                        {item.restoredFrom ? ' · 从历史版本恢复' : ''}
                      </small>
                      <ul>
                        {item.changes.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                      <code>{item.sourceDigest}</code>
                    </div>
                    {canDevelop && (
                      <Button disabled={busy} onClick={() => void restore(item.id)}>
                        恢复为新草稿
                      </Button>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className="studio-config">
                <p>
                  Schema 1.0 · 此定义用于验证查询绑定、保存业务口径和历史版本。源码由 Harness
                  自主生成。
                </p>
                {v?.manifest.report ? (
                  <>
                    <textarea
                      aria-label="报表 JSON 定义"
                      value={configText}
                      onChange={(e) => setConfigText(e.target.value)}
                      spellCheck={false}
                    />
                    <Button
                      variant="primary"
                      disabled={busy || !canDevelop}
                      onClick={() => void saveConfig()}
                    >
                      保存定义版本
                    </Button>
                    <div className="studio-report-history">
                      {reportVersions.map((rv) => (
                        <div key={rv.id}>
                          定义版本 v{rv.version}
                          <Button
                            disabled={busy}
                            onClick={() => {
                              void api
                                .request('/reports/' + rv.reportId + '/restore', {
                                  method: 'POST',
                                  body: { versionId: rv.id, message: '恢复定义草稿' },
                                })
                                .then(() => {
                                  setConfigText(JSON.stringify(rv.config, null, 2));
                                  setInfo('已从历史定义创建新版本。');
                                })
                                .catch(failure);
                            }}
                          >
                            恢复定义草稿
                          </Button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p>此应用暂无声明式报表定义。SITE 应用可以直接提交 React 页面。</p>
                )}
              </div>
            )}
            {building && (
              <div className="studio-build-log" role="status">
                <strong>构建 · {building.status}</strong>
                {building.logs.map((l, i) => (
                  <code key={i}>{l}</code>
                ))}
              </div>
            )}
          </section>
          <aside className="studio-assistant">
            <div className="studio-assistant-title">
              <span>✦</span>
              <div>
                <strong>与 Harness 一起构建</strong>
                <small>需求驱动，源码可控</small>
              </div>
            </div>
            <label className="studio-prompt-label" htmlFor="report-request">
              描述你想要的报表或修改
            </label>
            <textarea
              id="report-request"
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                setCopied(false);
              }}
            />
            <Button
              variant="primary"
              disabled={!prompt.trim()}
              onClick={() => {
                void navigator.clipboard
                  .writeText(instruction)
                  .then(() => setCopied(true))
                  .catch(failure);
              }}
            >
              {copied ? '已复制，粘贴到 Harness' : '复制到 Harness 开发'}
            </Button>
            <p className="studio-helper">
              Harness 编写代码，插件直接读写服务器文件、提交版本和构建真实测试预览。
            </p>
            <div className="studio-resource-section">
              <h3>
                授权数据集 <span>{datasets.length}</span>
              </h3>
              {datasets.slice(0, 8).map((d) => (
                <div className="studio-resource" key={d.id}>
                  <Icon name="table" size={14} />
                  <div>
                    <strong>{d.name}</strong>
                    <small>{d.key}</small>
                  </div>
                </div>
              ))}
            </div>
            <div className="studio-release-card">
              <Icon name="shield" size={18} />
              <strong>正式发布</strong>
              <p>选择待发布版本，在申请中填写审批人、使用范围和测试说明。</p>
              <a
                className="button"
                href={
                  '/?section=releases&create=1&app=' +
                  selected +
                  (version ? '&version=' + version : '')
                }
              >
                申请上线
              </a>
            </div>
          </aside>
        </div>
      )}
      {sharing && current && (
        <SiteSharingDialog
          api={api}
          app={current}
          versionId={version}
          onClose={() => setSharing(false)}
          onSaved={() => void reload().catch(failure)}
        />
      )}
      {create && (
        <CreateApp
          api={api}
          datasets={datasets}
          onClose={() => setCreate(false)}
          onSaved={async (a) => {
            setCreate(false);
            await reload();
            setSelected(a.id);
          }}
        />
      )}
    </div>
  );
}
function CreateApp({
  api,
  datasets,
  onClose,
  onSaved,
}: {
  api: Api;
  datasets: S['Dataset'][];
  onClose: () => void;
  onSaved: (app: S['StudioApp']) => Promise<void>;
}) {
  const [name, setName] = useState(''),
    [key, setKey] = useState(''),
    [type, setType] = useState<'REPORT' | 'SITE'>('REPORT'),
    [dataset, setDataset] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <Dialog
      title="创建企业应用"
      subtitle="先建立项目，再由 Harness 提交可构建的源码版本。"
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          void (async () => {
            try {
              let refs: S['DatasetRef'][] = [];
              if (dataset) {
                const r = await api.request<{ items: S['DatasetVersion'][] }>(
                  '/datasets/' + dataset + '/versions',
                );
                if (!r.items[0]) throw new Error('此数据集暂无可用版本。');
                refs = [{ datasetId: dataset, datasetVersionId: r.items[0].id }];
              }
              const app = await api.request<S['StudioApp']>('/apps', {
                method: 'POST',
                body: {
                  name,
                  key,
                  type,
                  description: '',
                  workspaceId: 'harness-workspace',
                  datasetRefs: refs,
                },
              });
              await onSaved(app);
            } catch (e) {
              setError(e instanceof Error ? e.message : '创建失败');
            } finally {
              setBusy(false);
            }
          })();
        }}
      >
        <div className="dialog-body studio-create">
          {error && <ErrorBanner error={error} />}
          <label>
            应用名称
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={200}
            />
          </label>
          <label>
            应用编码
            <input
              required
              value={key}
              onChange={(e) => setKey(e.target.value)}
              pattern="[a-z][a-z0-9_]{1,62}"
              placeholder="sales_analysis"
            />
          </label>
          <label>
            应用类型
            <select value={type} onChange={(e) => setType(e.target.value as 'REPORT' | 'SITE')}>
              <option value="REPORT">REPORT · 数据报表</option>
              <option value="SITE">SITE · 业务网站</option>
            </select>
          </label>
          <label>
            关联数据集
            <select value={dataset} onChange={(e) => setDataset(e.target.value)}>
              <option value="">暂不绑定</option>
              {datasets.map((d) => (
                <option value={d.id} key={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <footer className="dialog-footer">
          <Button onClick={onClose}>取消</Button>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? '创建中…' : '创建应用'}
          </Button>
        </footer>
      </form>
    </Dialog>
  );
}
