import { useCallback, useEffect, useState } from 'react';
import { NewRelease, ApprovalSteps, initialApprovalSteps } from './release-form.js';
import { Api, type S } from './api.js';
import { Button, Dialog, Empty, ErrorBanner, Loading, formatDate } from './components.js';
import { Icon } from './icons.js';
import { PreviewFrame } from './studio-page.js';
import { failureInfo, formatFailure } from '@eas/platform-sdk';
import './releases.css';
const labels: Record<string, string> = {
  draft: '待提交',
  submitted: '待审核',
  reviewing: '审核中',
  approved: '审批通过',
  rejected: '已驳回',
  withdrawn: '已撤回',
  cancelled: '已撤回',
  publishing: '发布中',
  published: '发布成功',
  failed: '发布失败',
  queued: '等待部署',
  active: '运行中',
  superseded: '历史版本',
};
const phases: Record<string, string> = {
  created: '创建申请',
  submitted: '提交审批',
  step_approved: '阶段审批通过',
  rejected: '审批驳回',
  withdrawn: '撤回申请',
  deployment_queued: '等待部署',
  manifest_validation: '校验发布清单',
  artifact_preparation: '准备正式产物',
  health_check: '部署健康检查',
  activated: '生产版本已激活',
  deployment_failed: '发布失败',
  deployment_retried: '重试部署',
};
const text = (error: unknown) => (error instanceof Error ? error.message : '操作未完成，请重试。');
const Badge = ({ status }: { status: string }) => (
  <span className={'release-badge ' + status}>
    <i />
    {labels[status] ?? status}
  </span>
);
type R = S['Stage06Release'];
type D = S['Stage06Deployment'];
export function ReleasesPage({ api, me }: { api: Api; me: S['CurrentUser'] }) {
  const [items, setItems] = useState<R[]>([]),
    [apps, setApps] = useState<S['StudioApp'][]>([]),
    [servicesReady, setServicesReady] = useState(true),
    [members, setMembers] = useState<S['ReleaseMember'][]>([]),
    [selected, setSelected] = useState(''),
    [filter, setFilter] = useState('all'),
    [search, setSearch] = useState(''),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [create, setCreate] = useState(new URLSearchParams(location.search).get('create') === '1'),
    [busy, setBusy] = useState(false),
    [tab, setTab] = useState('overview'),
    [comment, setComment] = useState(''),
    [history, setHistory] = useState<D[]>([]),
    [rollback, setRollback] = useState<D | null>(null),
    [rollbackReason, setRollbackReason] = useState(''),
    [rollbackTests, setRollbackTests] = useState(''),
    [rollbackSteps, setRollbackSteps] = useState<S['ReleaseStep'][]>(initialApprovalSteps);
  const r = items.find((item) => item.id === selected),
    name = (id: string) =>
      members.find((member) => member.userId === id)?.displayName ?? id.slice(0, 8),
    canDeploy = me.permissions.includes('release.deploy') && me.clientKind === 'human';
  const minePending = (item: R) =>
    ['submitted', 'reviewing'].includes(item.status) &&
    item.steps[item.currentStep]?.approverUserId === me.id;
  const refresh = useCallback(async () => {
    const result = await api.request<S['Stage06ReleasePage']>('/release-requests');
    setItems(result.items);
    setSelected((value) =>
      result.items.some((item) => item.id === value) ? value : (result.items[0]?.id ?? ''),
    );
  }, [api]);
  useEffect(() => {
    const abort = new AbortController();
    void Promise.all([
      refresh(),
      api
        .request<S['StudioAppPage']>('/apps', { signal: abort.signal })
        .then((result) => setApps(result.items)),
      api
        .request<S['ReleaseOptions']>('/release-options', { signal: abort.signal })
        .then((result) => {
          setMembers(result.members);
          setServicesReady(
            result.deploymentWorkerConfigured && result.productionConnectorConfigured,
          );
        }),
    ])
      .catch((error) => {
        if (!abort.signal.aborted) setError(text(error));
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [api, refresh]);
  useEffect(() => {
    let running = false;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible' && !running) {
        running = true;
        void refresh()
          .catch((error) => setError(text(error)))
          .finally(() => {
            running = false;
          });
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [refresh]);
  useEffect(() => {
    setHistory([]);
    if (r)
      void api
        .request<S['Stage06DeploymentPage']>('/apps/' + r.appId + '/deployments')
        .then((result) => setHistory(result.items))
        .catch((error) => setError(text(error)));
  }, [api, r?.appId, r?.deployment?.status]);
  const visible = items.filter(
    (item) =>
      (filter === 'all' ||
        (filter === 'mine' && item.requesterUserId === me.id) ||
        (filter === 'pending' && minePending(item))) &&
      (!search ||
        [item.appName, item.reason, item.status].some((value) =>
          value.toLowerCase().includes(search.toLowerCase()),
        )),
  );
  async function action(path: string, body?: unknown) {
    setBusy(true);
    setError('');
    try {
      await api.request(path, { method: 'POST', ...(body !== undefined ? { body } : {}) });
      setComment('');
      await refresh();
    } catch (error) {
      setError(text(error));
    } finally {
      setBusy(false);
    }
  }
  const previous = items.find(
      (item) => item.appId === r?.appId && item.id !== r?.id && item.status === 'published',
    ),
    envelope = r?.manifest as
      | {
          changes?: string[];
          scopes?: {
            datasetId: string;
            fieldKeys: string[];
            metricKeys: string[];
            sensitiveFieldKeys: string[];
          }[];
          manifest?: S['SourceManifest'];
        }
      | undefined;
  return (
    <section className="release-page">
      <header className="release-heading">
        <div>
          <span className="release-eyebrow">RELEASE CENTER</span>
          <h1>上线发布</h1>
          <p>从一次审阅，到一个可追溯的正式版本。</p>
        </div>
        <div className="release-heading-actions">
          <Button
            onClick={() => void refresh().catch((error) => setError(text(error)))}
            icon="refresh"
          >
            刷新
          </Button>
          {me.permissions.includes('release.create') && (
            <Button
              variant="primary"
              icon="plus"
              disabled={!apps.length}
              onClick={() => setCreate(true)}
            >
              新建上线申请
            </Button>
          )}
        </div>
      </header>
      <div className="release-summary">
        <div>
          <span>待我审批</span>
          <strong>
            {items.filter(minePending).length}
            <small>项申请</small>
          </strong>
        </div>
        <div>
          <span>我的进行中申请</span>
          <strong>
            {
              items.filter(
                (item) =>
                  item.requesterUserId === me.id &&
                  ['draft', 'submitted', 'reviewing', 'approved', 'publishing'].includes(
                    item.status,
                  ),
              ).length
            }
            <small>项申请</small>
          </strong>
        </div>
        <div>
          <span>已发布</span>
          <strong>
            {items.filter((item) => item.status === 'published').length}
            <small>次发布</small>
          </strong>
        </div>
        <div className="release-summary-note">
          <Icon name="shield" size={20} />
          <p>
            每次审批绑定一个确定版本
            <br />
            <span>{servicesReady ? '生产授权与版本激活同步完成' : '生产数据运行服务待配置'}</span>
          </p>
        </div>
      </div>
      {error && <ErrorBanner error={error} />}
      <div className="release-workbench">
        <section className="release-list">
          <div className="release-list-toolbar">
            <div className="release-tabs" role="tablist">
              {[
                ['all', '全部申请'],
                ['mine', '我发起的'],
                ['pending', '待我审批'],
              ].map(([value, label]) => (
                <button
                  role="tab"
                  aria-selected={filter === value}
                  className={filter === value ? 'active' : ''}
                  onClick={() => setFilter(value!)}
                  key={value}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="release-search">
              <Icon name="search" size={15} />
              <input
                aria-label="搜索申请"
                placeholder="搜索应用或申请说明"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          </div>
          {loading ? (
            <Loading />
          ) : visible.length ? (
            visible.map((item) => (
              <button
                key={item.id}
                className={'release-list-item ' + (selected === item.id ? 'selected' : '')}
                onClick={() => {
                  setSelected(item.id);
                  setTab('overview');
                  setComment('');
                }}
              >
                <div>
                  <span className="release-app-icon">
                    <Icon name={item.kind === 'rollback' ? 'refresh' : 'code'} size={18} />
                  </span>
                  <span>
                    <strong>{item.appName}</strong>
                    <small>
                      版本 {item.version} · {item.kind === 'rollback' ? '回滚申请' : '正式发布'}
                    </small>
                  </span>
                  <Badge status={item.status} />
                </div>
                <p>{item.reason}</p>
                <footer>
                  <span>{name(item.requesterUserId)}</span>
                  <time>{formatDate(item.createdAt)}</time>
                </footer>
              </button>
            ))
          ) : (
            <Empty
              title="这里还没有申请"
              description={
                filter === 'pending'
                  ? '轮到你审核的申请会出现在这里。'
                  : '选择已测试的版本，开始一次正式发布。'
              }
              icon="folder"
            />
          )}
        </section>
        <section className="release-detail">
          {!r ? (
            <Empty
              icon="shield"
              title="选择一项上线申请"
              description="查看审批进度、冻结版本与部署记录。"
            />
          ) : (
            <>
              <header className="release-detail-heading">
                <div>
                  <span className="release-eyebrow">
                    {r.kind === 'rollback' ? 'ROLLBACK REQUEST' : 'RELEASE REQUEST'} ·{' '}
                    {r.id.slice(0, 8)}
                  </span>
                  <h2>
                    {r.appName}
                    <Badge status={r.status} />
                  </h2>
                  <p>
                    版本 {r.version}{' '}
                    <span>
                      由 {name(r.requesterUserId)} 发起 · {formatDate(r.createdAt)}
                    </span>
                  </p>
                </div>
                <div className="release-actions">
                  {r.requesterUserId === me.id && r.status === 'draft' && (
                    <Button
                      variant="primary"
                      disabled={busy}
                      onClick={() => void action('/release-requests/' + r.id + '/submit')}
                    >
                      提交审批
                    </Button>
                  )}
                  {r.requesterUserId === me.id &&
                    ['draft', 'submitted', 'reviewing'].includes(r.status) && (
                      <Button
                        disabled={busy}
                        onClick={() => void action('/release-requests/' + r.id + '/cancel')}
                      >
                        撤回
                      </Button>
                    )}
                  {canDeploy && r.status === 'approved' && (
                    <Button
                      variant="primary"
                      disabled={busy}
                      onClick={() => void action('/release-requests/' + r.id + '/deployments')}
                    >
                      发布到生产
                    </Button>
                  )}
                  {canDeploy && r.deployment?.status === 'failed' && (
                    <Button
                      variant="primary"
                      disabled={busy}
                      onClick={() => void action('/deployments/' + r.deployment!.id + '/retry')}
                    >
                      重试部署
                    </Button>
                  )}
                  {r.status === 'published' && (
                    <a
                      className="button"
                      href={'/p/' + r.appId + '?organizationId=' + api.organizationId}
                      target="_blank"
                      rel="noreferrer"
                    >
                      打开正式站点 <Icon name="arrow" size={14} />
                    </a>
                  )}
                </div>
              </header>
              <ol className="release-flow">
                {r.steps.map((step, index) => {
                  const record = r.approvals.find((approval) => approval.stepIndex === index);
                  return (
                    <li
                      key={step.roleKey}
                      className={
                        record?.decision === 'approve'
                          ? 'done'
                          : record?.decision === 'reject'
                            ? 'rejected'
                            : index === r.currentStep &&
                                ['submitted', 'reviewing'].includes(r.status)
                              ? 'current'
                              : ''
                      }
                    >
                      <span>
                        {record?.decision === 'approve' ? (
                          <Icon name="check" size={14} />
                        ) : (
                          index + 1
                        )}
                      </span>
                      <div>
                        <strong>{step.label}</strong>
                        <small>{name(step.approverUserId)}</small>
                      </div>
                    </li>
                  );
                })}
                <li
                  className={
                    r.status === 'published' ? 'done' : r.status === 'publishing' ? 'current' : ''
                  }
                >
                  <span>
                    <Icon name="code" size={14} />
                  </span>
                  <div>
                    <strong>正式发布</strong>
                    <small>
                      {r.deployment
                        ? (labels[r.deployment.status] ?? r.deployment.phase)
                        : r.status === 'approved'
                          ? '等待发布'
                          : '等待审批完成'}
                    </small>
                  </div>
                </li>
              </ol>
              <div className="release-detail-tabs" role="tablist">
                {[
                  ['overview', '申请详情'],
                  ['versions', '版本对比'],
                  ['activity', '审批与部署日志'],
                  ['history', '发布历史'],
                ].map(([value, label]) => (
                  <button
                    role="tab"
                    aria-selected={tab === value}
                    className={tab === value ? 'active' : ''}
                    onClick={() => setTab(value!)}
                    key={value}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="release-detail-body">
                {tab === 'overview' ? (
                  <>
                    <div className="release-copy-block">
                      <h3>业务说明</h3>
                      <p>{r.reason}</p>
                    </div>
                    <div className="release-copy-block">
                      <h3>测试结果</h3>
                      <p>{r.testResults}</p>
                    </div>
                    <div className="release-metadata">
                      <div>
                        <span>目标使用部门</span>
                        <strong>{r.targetDepartments.join('、') || '按批准成员范围'}</strong>
                      </div>
                      <div>
                        <span>源码内容哈希</span>
                        <code title={r.sourceDigest}>{r.sourceDigest.slice(0, 30)}…</code>
                      </div>
                      <div>
                        <span>审批清单哈希</span>
                        <code title={r.snapshotDigest}>{r.snapshotDigest.slice(0, 30)}…</code>
                      </div>
                    </div>
                    <div className="release-copy-block">
                      <h3>批准的数据范围</h3>
                      {envelope?.scopes?.length ? (
                        envelope.scopes.map((scope, index) => (
                          <div className="release-scope" key={scope.datasetId}>
                            <strong>
                              数据集 {index + 1} <code>{scope.datasetId.slice(0, 8)}</code>
                            </strong>
                            <p>字段：{scope.fieldKeys.join('、')}</p>
                            <p>指标：{scope.metricKeys.join('、') || '无聚合指标'}</p>
                            {scope.sensitiveFieldKeys.length > 0 && (
                              <p className="release-sensitive">
                                敏感字段声明：{scope.sensitiveFieldKeys.join('、')}
                              </p>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="muted">此版本不使用业务数据集。</p>
                      )}
                    </div>
                    {r.deployment?.failureCode && (
                      <ErrorBanner
                        error={formatFailure(
                          failureInfo(r.deployment.failureCode, {
                            operation: '生产部署',
                            ...(r.deployment.traceId ? { traceId: r.deployment.traceId } : {}),
                          }),
                        )}
                      />
                    )}
                  </>
                ) : tab === 'versions' ? (
                  <>
                    <div className="release-compare">
                      <div>
                        <span>上次已发布版本</span>
                        <strong>{previous ? '版本 ' + previous.version : '首次发布'}</strong>
                        <code>{previous?.sourceDigest.slice(0, 30) ?? '尚无正式版本'}</code>
                      </div>
                      <Icon name="chevron" size={20} />
                      <div>
                        <span>本次冻结版本</span>
                        <strong>版本 {r.version}</strong>
                        <code>{r.sourceDigest.slice(0, 30)}…</code>
                      </div>
                    </div>
                    <h3>源码变更</h3>
                    <ul className="release-file-changes">
                      {envelope?.changes?.map((change, index) => (
                        <li key={index}>
                          <Icon name="code" size={14} />
                          <code>{change}</code>
                        </li>
                      ))}
                    </ul>
                    <details className="release-manifest">
                      <summary>查看完整发布清单与权限快照</summary>
                      <pre>{JSON.stringify(r.manifest, null, 2)}</pre>
                    </details>
                  </>
                ) : tab === 'activity' ? (
                  <ol className="release-event-list">
                    {r.events.map((event) => (
                      <li key={event.id}>
                        <span className="release-event-dot" />
                        <div>
                          <header>
                            <strong>{phases[event.event] ?? event.event}</strong>
                            <time>{formatDate(event.createdAt)}</time>
                          </header>
                          <p>
                            {name(event.actorUserId)}
                            {typeof event.detail['roleKey'] === 'string'
                              ? ' · ' + event.detail['roleKey']
                              : ''}
                          </p>
                          {r.approvals.find(
                            (approval) => approval.stepIndex === event.detail['stepIndex'],
                          )?.comment && (
                            <blockquote>
                              {
                                r.approvals.find(
                                  (approval) => approval.stepIndex === event.detail['stepIndex'],
                                )?.comment
                              }
                            </blockquote>
                          )}
                          {Boolean(event.detail['code']) && (
                            <code className="release-sensitive">
                              {String(event.detail['code'])}
                            </code>
                          )}
                          <small>追踪 {event.traceId}</small>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="release-history">
                    {history.map((d) => (
                      <article key={d.id}>
                        <div>
                          <Badge status={d.status} />
                          <strong>
                            {d.appVersionId === r.appVersionId
                              ? '版本 ' + r.version
                              : d.appVersionId.slice(0, 8)}
                          </strong>
                          <small>{formatDate(d.createdAt)}</small>
                        </div>
                        <code>{d.id.slice(0, 12)}</code>
                        {me.permissions.includes('release.create') && d.status === 'superseded' && (
                          <Button
                            onClick={() => {
                              setRollback(d);
                              setRollbackReason('');
                              setRollbackTests('');
                              setRollbackSteps(initialApprovalSteps());
                            }}
                          >
                            申请回滚到此版本
                          </Button>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </div>
              {minePending(r) && (
                <form
                  className="release-review"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void action('/release-requests/' + r.id + '/approvals', {
                      stepIndex: r.currentStep,
                      decision: 'approve',
                      comment,
                    });
                  }}
                >
                  <label>
                    审批意见
                    <textarea
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                      placeholder="说明本次审核结论，以及需要关注的事项…"
                    />
                  </label>
                  <footer>
                    <span>
                      <Icon name="shield" size={14} />以 {name(me.id)} 的身份记录审批
                    </span>
                    <Button
                      type="button"
                      variant="danger"
                      disabled={busy}
                      onClick={() =>
                        void action('/release-requests/' + r.id + '/approvals', {
                          stepIndex: r.currentStep,
                          decision: 'reject',
                          comment,
                        })
                      }
                    >
                      驳回
                    </Button>
                    <Button variant="primary" type="submit" disabled={busy}>
                      同意并流转
                    </Button>
                  </footer>
                </form>
              )}
            </>
          )}
        </section>
      </div>
      {create && !loading && apps.length > 0 && (
        <NewRelease
          api={api}
          apps={apps}
          members={members}
          me={me}
          onClose={() => setCreate(false)}
          onSaved={async (item, notice) => {
            setCreate(false);
            const url = new URL(location.href);
            url.searchParams.delete('create');
            window.history.replaceState(null, '', url);
            setSelected(item.id);
            if (notice) setError(notice);
            await refresh();
          }}
        />
      )}
      {rollback && (
        <Dialog
          title="申请回滚"
          subtitle="目标版本将按当前权限和审批流程重新审核。"
          onClose={() => setRollback(null)}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setBusy(true);
              void api
                .request<R>('/apps/' + rollback.appId + '/rollback-requests', {
                  method: 'POST',
                  body: {
                    targetDeploymentId: rollback.id,
                    reason: rollbackReason,
                    testResults: rollbackTests,
                    approvalSteps: rollbackSteps,
                  },
                })
                .then(async (item) => {
                  setSelected(item.id);
                  setRollback(null);
                  await refresh();
                })
                .catch((error) => setError(text(error)))
                .finally(() => setBusy(false));
            }}
          >
            <div className="dialog-body release-form">
              <ApprovalSteps
                steps={rollbackSteps}
                onChange={setRollbackSteps}
                members={members}
                requesterId={me.id}
                disabled={busy}
              />
              <label className="field">
                <span>回滚原因</span>
                <textarea
                  required
                  value={rollbackReason}
                  onChange={(event) => setRollbackReason(event.target.value)}
                />
              </label>
              <label className="field">
                <span>目标版本测试结果</span>
                <textarea
                  required
                  value={rollbackTests}
                  onChange={(event) => setRollbackTests(event.target.value)}
                  placeholder="填写此版本在当前数据权限下的核验结果。"
                />
              </label>
              <p>仅切换应用版本，不回滚外部数据库的业务数据。</p>
            </div>
            <footer className="dialog-footer">
              <Button type="button" onClick={() => setRollback(null)}>
                取消
              </Button>
              <Button type="submit" variant="primary" disabled={busy}>
                创建回滚申请
              </Button>
            </footer>
          </form>
        </Dialog>
      )}
    </section>
  );
}
export function ProductionSitePage({
  api,
  appId,
  onLogout,
}: {
  api: Api;
  appId: string;
  onLogout: () => void;
}) {
  const [preview, setPreview] = useState<S['StudioPreview'] | null>(null),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    const load = async () => {
      try {
        const result = await api.request<S['StudioPreview']>('/runtime/apps/' + appId + '/site', {
          signal: abort.signal,
        });
        setPreview((previous) => (previous?.buildId === result.buildId ? previous : result));
        setError('');
      } catch (error) {
        if (!abort.signal.aborted) {
          setPreview(null);
          setError(text(error));
        }
      }
    };
    void load();
    const timer = setInterval(() => void load(), 10000);
    return () => {
      abort.abort();
      clearInterval(timer);
    };
  }, [api, appId, retry]);
  return (
    <main className="shared-site shared-site-standalone">
      {error ? (
        <section className="shared-site-unavailable">
          <h1>正式站点暂不可访问</h1>
          <ErrorBanner error={error} />
          <Button onClick={() => setRetry((value) => value + 1)}>重新检查</Button>
          <Button onClick={onLogout}>切换账号</Button>
        </section>
      ) : preview ? (
        <PreviewFrame api={api} preview={preview} />
      ) : (
        <Loading />
      )}
    </main>
  );
}
