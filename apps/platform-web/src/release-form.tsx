import { useEffect, useMemo, useRef, useState } from 'react';
import { Api, type S } from './api.js';
import { Button, Dialog, ErrorBanner, formatDate } from './components.js';
import { Icon } from './icons.js';
import { PreviewFrame } from './studio-page.js';
import { failureInfo, formatFailure } from '@eas/platform-sdk';

type Step = S['ReleaseStep'];
const message = (error: unknown) =>
  error instanceof Error ? error.message : '操作未完成，请重试。';
const buildLabels: Record<string, string> = {
  queued: '等待构建',
  running: '构建中',
  succeeded: '已构建',
  failed: '构建失败',
  cancelled: '构建已取消',
};
export const initialApprovalSteps = (): Step[] => [
  { roleKey: 'review', label: '审批人', approverUserId: '' },
];

export function ApprovalSteps({
  steps,
  onChange,
  members,
  requesterId,
  disabled = false,
}: {
  steps: Step[];
  onChange: (steps: Step[]) => void;
  members: S['ReleaseMember'][];
  requesterId: string;
  disabled?: boolean;
}) {
  const reviewers = members.filter((member) => member.canApprove && member.userId !== requesterId);
  const move = (index: number, offset: number) => {
    const next = [...steps],
      target = index + offset;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  };
  return (
    <fieldset className="release-approvals-field">
      <legend>审批人</legend>
      <p className="release-field-help">按下列顺序审批，可添加阶段并调整顺序。</p>
      <div className="release-approval-rows">
        {steps.map((step, index) => (
          <div className="release-approval-row" key={step.roleKey}>
            <span className="release-step-number">{index + 1}</span>
            <label>
              <span>审批阶段</span>
              <input
                required
                disabled={disabled}
                value={step.label}
                placeholder="例如：业务负责人"
                onChange={(event) =>
                  onChange(
                    steps.map((value, i) =>
                      i === index ? { ...value, label: event.target.value } : value,
                    ),
                  )
                }
              />
            </label>
            <label>
              <span>选择审批人</span>
              <select
                required
                disabled={disabled}
                value={step.approverUserId}
                onChange={(event) =>
                  onChange(
                    steps.map((value, i) =>
                      i === index ? { ...value, approverUserId: event.target.value } : value,
                    ),
                  )
                }
              >
                <option value="">请选择审批人</option>
                {reviewers.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.displayName}
                    {member.departmentCodes.length ? ' · ' + member.departmentCodes.join('、') : ''}
                  </option>
                ))}
              </select>
            </label>
            <div className="release-step-actions">
              <button
                type="button"
                aria-label={'上移第' + (index + 1) + '个审批阶段'}
                disabled={disabled || index === 0}
                onClick={() => move(index, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                aria-label={'下移第' + (index + 1) + '个审批阶段'}
                disabled={disabled || index === steps.length - 1}
                onClick={() => move(index, 1)}
              >
                ↓
              </button>
              <button
                type="button"
                aria-label={'移除第' + (index + 1) + '个审批阶段'}
                disabled={disabled}
                onClick={() => onChange(steps.filter((_, i) => i !== index))}
              >
                <Icon name="x" size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <Button
        type="button"
        icon="plus"
        disabled={disabled}
        onClick={() =>
          onChange([
            ...steps,
            { roleKey: 'step_' + crypto.randomUUID(), label: '审批人', approverUserId: '' },
          ])
        }
      >
        添加审批阶段
      </Button>
      {!reviewers.length && (
        <p role="status" className="release-field-help">
          当前组织没有可选的其他审批人，请先为实际负责人分配审批权限。
        </p>
      )}
    </fieldset>
  );
}

export function NewRelease({
  api,
  apps,
  members,
  me,
  onClose,
  onSaved,
}: {
  api: Api;
  apps: S['StudioApp'][];
  members: S['ReleaseMember'][];
  me: S['CurrentUser'];
  onClose: () => void;
  onSaved: (release: S['Stage06Release'], notice?: string) => Promise<void>;
}) {
  const params = new URLSearchParams(location.search);
  const [appId, setAppId] = useState(
    apps.find((app) => app.id === params.get('app'))?.id ?? apps[0]?.id ?? '',
  );
  const [versions, setVersions] = useState<S['StudioVersion'][]>([]),
    [versionId, setVersionId] = useState(''),
    [models, setModels] = useState<S['DatasetVersion'][]>([]);
  const [audience, setAudience] = useState<string[]>([me.id]),
    [departments, setDepartments] = useState<string[]>([]),
    [approvalSteps, setApprovalSteps] = useState<Step[]>(initialApprovalSteps);
  const [reason, setReason] = useState(''),
    [testResults, setTestResults] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState('');
  const [preview, setPreview] = useState<S['StudioPreview'] | null>(null),
    [currentBuild, setCurrentBuild] = useState<S['StudioBuild'] | null>(null),
    [intent, setIntent] = useState<'draft' | 'submit'>('submit');
  const operation = useRef<AbortController | null>(null);
  useEffect(() => () => operation.current?.abort(), []);
  useEffect(() => {
    const abort = new AbortController();
    setVersions([]);
    setVersionId('');
    setError('');
    setApprovalSteps(initialApprovalSteps());
    if (appId) {
      void api
        .request<S['StudioVersionPage']>('/apps/' + appId + '/versions', { signal: abort.signal })
        .then((result) => {
          setVersions(result.items);
          const requested = new URLSearchParams(location.search).get('version');
          setVersionId(
            result.items.find((version) => version.id === requested)?.id ??
              result.items[0]?.id ??
              '',
          );
        })
        .catch((error) => {
          if (!abort.signal.aborted) setError(message(error));
        });
      // An old saved flow may prefill the form, but it is never a prerequisite.
      void api
        .request<S['ReleasePolicy']>('/apps/' + appId + '/release-policy', { signal: abort.signal })
        .then((policy) => {
          if (policy.steps.length)
            setApprovalSteps(
              policy.steps.map((step) => ({
                ...step,
                approverUserId: step.approverUserId === me.id ? '' : step.approverUserId,
              })),
            );
        })
        .catch(() => {});
    }
    return () => abort.abort();
  }, [api, appId, me.id]);
  const version = versions.find((value) => value.id === versionId);
  useEffect(() => {
    const abort = new AbortController();
    setModels([]);
    setPreview(null);
    setCurrentBuild(null);
    setProgress('');
    if (version)
      void Promise.all(
        version.manifest.datasetRefs.map(async (ref) => {
          const result = await api.request<{ items: S['DatasetVersion'][] }>(
            '/datasets/' + ref.datasetId + '/versions',
            { signal: abort.signal },
          );
          const model = result.items.find((value) => value.id === ref.datasetVersionId);
          if (!model) throw new Error('找不到版本引用的数据集定义。');
          return model;
        }),
      )
        .then(setModels)
        .catch((error) => {
          if (!abort.signal.aborted) setError(message(error));
        });
    return () => abort.abort();
  }, [api, versionId]);
  const scopes = useMemo(
    () =>
      models.map((model) => {
        const queries =
            version?.manifest.queries
              .filter((binding) => binding.query.datasetVersionId === model.id)
              .map((binding) => binding.query) ?? [],
          metrics = [...new Set(queries.flatMap((query) => query.metrics))];
        const fields = new Set(
          queries.flatMap((query) => [
            ...query.dimensions,
            ...query.groupBy,
            ...query.filters.map((filter) => filter.fieldKey),
            ...(query.timeRange ? [query.timeRange.fieldKey] : []),
          ]),
        );
        for (const key of metrics) {
          const metric = model.metrics.find((value) => value.key === key);
          if (metric) {
            fields.add(metric.fieldKey);
            metric.filters.forEach((filter) => fields.add(filter.fieldKey));
          }
        }
        return {
          datasetVersionId: model.id,
          fieldKeys: [...fields],
          metricKeys: metrics,
          sensitiveFieldKeys: model.fields
            .filter(
              (field) =>
                fields.has(field.key) &&
                ['restricted', 'confidential'].includes(field.classification),
            )
            .map((field) => field.key),
        };
      }),
    [models, version],
  );
  const departmentOptions = [...new Set(members.flatMap((member) => member.departmentCodes))];
  const build = currentBuild ?? version?.latestBuild,
    status = version?.successfulBuildId
      ? '已构建，可预览'
      : build
        ? (buildLabels[build.status] ?? build.status)
        : '尚未构建';
  const reviewersReady =
    approvalSteps.length > 0 &&
    approvalSteps.every(
      (step) =>
        step.label.trim() &&
        members.some(
          (member) =>
            member.userId === step.approverUserId && member.canApprove && member.userId !== me.id,
        ),
    );
  const ready =
    !!version &&
    models.length === version.manifest.datasetRefs.length &&
    audience.length > 0 &&
    reviewersReady;
  function selectDepartment(department: string, checked: boolean) {
    const next = checked
      ? [...departments, department]
      : departments.filter((value) => value !== department);
    setDepartments(next);
    setAudience((current) =>
      current.filter(
        (id) =>
          !next.length ||
          members
            .find((member) => member.userId === id)
            ?.departmentCodes.some((code) => next.includes(code)),
      ),
    );
  }
  function updateBuild(build: S['StudioBuild']) {
    setCurrentBuild(build);
    if (build.status === 'succeeded')
      setVersions((current) =>
        current.map((value) =>
          value.id === build.appVersionId
            ? { ...value, latestBuild: build, successfulBuildId: build.id }
            : value,
        ),
      );
  }
  async function prepareBuild(signal: AbortSignal) {
    if (!version) throw new Error('请选择源码版本。');
    if (version.successfulBuildId) return version.successfulBuildId;
    let job = currentBuild ?? version.latestBuild;
    if (!job || !['queued', 'running'].includes(job.status))
      job = await api.request<S['StudioBuild']>('/app-versions/' + version.id + '/builds', {
        method: 'POST',
        signal,
      });
    updateBuild(job);
    while (['queued', 'running'].includes(job.status)) {
      setProgress(job.status === 'queued' ? '正在等待构建所选版本…' : '正在构建所选版本…');
      await new Promise<void>((resolve, reject) => {
        const onAbort = () => {
          clearTimeout(timer);
          reject(signal.reason);
        };
        const timer = setTimeout(() => {
          signal.removeEventListener('abort', onAbort);
          resolve();
        }, 500);
        signal.addEventListener('abort', onAbort, { once: true });
        if (signal.aborted) onAbort();
      });
      job = await api.request<S['StudioBuild']>('/build-jobs/' + job.id, { signal });
      updateBuild(job);
    }
    if (job.status !== 'succeeded')
      throw new Error(
        formatFailure(
          failureInfo(job.failureCode ?? 'BUILD_FAILED', {
            operation: '构建版本 ' + version.version,
            details: [{ field: 'buildJobId', reason: job.id }],
          }),
        ),
      );
    setProgress('构建完成');
    return job.id;
  }
  async function showPreview() {
    const abort = new AbortController();
    operation.current = abort;
    setBusy(true);
    setError('');
    try {
      await prepareBuild(abort.signal);
      const result = await api.request<S['StudioPreview']>(
        '/apps/' + appId + '/preview/' + versionId,
        { signal: abort.signal },
      );
      if (!abort.signal.aborted) {
        setPreview(result);
        setProgress('');
      }
    } catch (error) {
      if (!abort.signal.aborted) setError(message(error));
    } finally {
      if (!abort.signal.aborted) setBusy(false);
    }
  }
  async function save() {
    if (!version || !ready) return;
    const abort = new AbortController();
    operation.current = abort;
    setBusy(true);
    setError('');
    try {
      const buildJobId = await prepareBuild(abort.signal);
      setProgress(intent === 'draft' ? '正在保存申请…' : '正在提交上线申请…');
      let release = await api.request<S['Stage06Release']>('/release-requests', {
        method: 'POST',
        signal: abort.signal,
        body: {
          appVersionId: version.id,
          buildJobId,
          reason,
          testResults,
          targetDepartments: departments,
          audienceUserIds: audience,
          scopes,
          approvalSteps,
        },
      });
      if (intent === 'submit')
        try {
          release = await api.request<S['Stage06Release']>(
            '/release-requests/' + release.id + '/submit',
            { method: 'POST', signal: abort.signal },
          );
        } catch (error) {
          if (!abort.signal.aborted)
            await onSaved(release, '草稿已保存，提交审批未完成。' + message(error));
          return;
        }
      if (!abort.signal.aborted) await onSaved(release);
    } catch (error) {
      if (!abort.signal.aborted) setError(message(error));
    } finally {
      if (!abort.signal.aborted) {
        setBusy(false);
        setProgress('');
      }
    }
  }
  return (
    <Dialog
      title="新建上线申请"
      subtitle="选择版本、审批人和使用范围，一次完成上线申请。"
      onClose={onClose}
      wide
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <div className="dialog-body release-form">
          {error && <ErrorBanner error={error} />}
          <div className="release-form-grid">
            <label className="field">
              <span>应用</span>
              <select
                required
                disabled={busy}
                value={appId}
                onChange={(event) => setAppId(event.target.value)}
              >
                {apps.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>待发布版本</span>
              <select
                required
                disabled={busy}
                value={versionId}
                onChange={(event) => setVersionId(event.target.value)}
              >
                <option value="">选择源码版本</option>
                {versions.map((version) => (
                  <option key={version.id} value={version.id}>
                    版本 {version.version} ·{' '}
                    {version.successfulBuildId
                      ? '已构建'
                      : version.latestBuild
                        ? buildLabels[version.latestBuild.status]
                        : '未构建'}{' '}
                    · {version.message || formatDate(version.createdAt)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {version && (
            <div className="release-build-state">
              <div>
                <strong>
                  版本 {version.version} · {status}
                </strong>
                <small>
                  {progress ||
                    (!version.successfulBuildId
                      ? '可以在这里构建并预览；提交时也会自动完成构建。'
                      : '本次申请将绑定这个版本的成功构建。')}
                </small>
              </div>
              <Button type="button" disabled={busy} onClick={() => void showPreview()}>
                {version.successfulBuildId ? '测试预览' : '构建并预览'}
              </Button>
            </div>
          )}
          {preview && (
            <section className="release-inline-preview">
              <header>
                <strong>版本 {version?.version} · TEST 预览</strong>
                <Button type="button" onClick={() => setPreview(null)}>
                  收起预览
                </Button>
              </header>
              <PreviewFrame api={api} preview={preview} />
            </section>
          )}
          <ApprovalSteps
            steps={approvalSteps}
            onChange={setApprovalSteps}
            members={members}
            requesterId={me.id}
            disabled={busy}
          />
          <label className="field">
            <span>业务说明</span>
            <textarea
              required
              disabled={busy}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="本次上线解决什么问题，有哪些变更？"
            />
          </label>
          <label className="field">
            <span>测试结果</span>
            <textarea
              required
              disabled={busy}
              value={testResults}
              onChange={(event) => setTestResults(event.target.value)}
              placeholder="填写测试范围、预期与实际结果，以及验收说明。"
            />
          </label>
          <fieldset>
            <legend>目标使用部门</legend>
            <div className="release-checks">
              {departmentOptions.map((department) => (
                <label key={department}>
                  <input
                    disabled={busy}
                    type="checkbox"
                    checked={departments.includes(department)}
                    onChange={(event) => selectDepartment(department, event.target.checked)}
                  />
                  {department}
                </label>
              ))}
            </div>
            <small>不选择部门时，按下方成员范围使用。</small>
          </fieldset>
          <fieldset>
            <legend>使用成员</legend>
            <div className="release-checks">
              {members
                .filter(
                  (member) =>
                    !departments.length ||
                    member.departmentCodes.some((code) => departments.includes(code)),
                )
                .map((member) => (
                  <label key={member.userId}>
                    <input
                      disabled={busy}
                      type="checkbox"
                      checked={audience.includes(member.userId)}
                      onChange={(event) =>
                        setAudience(
                          event.target.checked
                            ? [...audience, member.userId]
                            : audience.filter((id) => id !== member.userId),
                        )
                      }
                    />
                    {member.displayName}
                  </label>
                ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>版本使用的数据与权限范围</legend>
            {scopes.length ? (
              scopes.map((scope, index) => (
                <div className="release-scope" key={scope.datasetVersionId}>
                  <strong>{'数据集 ' + (index + 1)}</strong>
                  <p>字段：{scope.fieldKeys.join('、')}</p>
                  <p>指标：{scope.metricKeys.join('、') || '无'}</p>
                  {scope.sensitiveFieldKeys.length > 0 && (
                    <p className="release-sensitive">
                      敏感字段声明：{scope.sensitiveFieldKeys.join('、')}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="muted">
                {version?.manifest.datasetRefs.length
                  ? '正在读取业务语义…'
                  : '此版本不引用业务数据集。'}
              </p>
            )}
          </fieldset>
        </div>
        <footer className="dialog-footer">
          <span className="release-submit-progress" role="status">
            {busy ? progress : ''}
          </span>
          <Button type="button" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" disabled={busy || !ready} onClick={() => setIntent('draft')}>
            保存草稿
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={busy || !ready}
            onClick={() => setIntent('submit')}
          >
            {busy ? '正在处理…' : version?.successfulBuildId ? '提交审批' : '构建并提交审批'}
          </Button>
        </footer>
      </form>
    </Dialog>
  );
}
