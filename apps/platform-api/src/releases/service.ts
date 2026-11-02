import { randomUUID } from 'node:crypto';
import { digest, canonical } from '@eas/connector-transport';
import type { components, DeploymentAttestation } from '@eas/api-contract';
import type { Sql } from '../infrastructure/database.js';
import { Fault, requireValue } from '../infrastructure/errors.js';
import type { Identity, Subject, Actor } from '../identity/identity.js';
import type { StudioReleasePort, ReleaseSource } from '../studio/release-port.js';
import type {
  CatalogReleasePort,
  ReleaseMapping,
  ReleaseRequirements,
} from '../catalog/release-port.js';
type S = components['schemas'];
export interface ReleaseQueryPort {
  scope(
    tx: Sql,
    s: Subject,
    ref: S['DatasetRef'],
    fields: string[],
    metrics: string[],
  ): Promise<{
    rowPolicyKey: string;
    policyId: string;
    policyDigest: string;
    timeoutMs: number;
    sensitiveFieldKeys: string[];
  }>;
}
export type FrozenScope = S['RequestedReleaseScope'] & {
  datasetId: string;
  mapping: ReleaseMapping | null;
  expectedSchema?: ReleaseRequirements;
  rowPolicyKey: string;
  policyId: string;
  policyDigest: string;
  timeoutMs: number;
};
export interface Envelope {
  schemaVersion: 1;
  sourceDigest: string;
  artifactId: string;
  artifactDigest: string;
  manifestDigest: string;
  manifest: S['SourceManifest'];
  changes: string[];
  version: number;
  appName: string;
  testResults: string;
  reason: string;
  targetDepartments: string[];
  scopes: FrozenScope[];
  workflow: { revision: number; steps: S['ReleaseStep'][] };
  gateway: {
    schemaVersion: 1;
    appVersionId: string;
    artifactDigest: string;
    scopeDigest: string;
    reportsDigest: string;
    audienceDigest: string;
    requiredApproverUserIds: string[];
  };
}
export interface ReleaseRow {
  id: string;
  organization_id: string;
  app_id: string;
  app_version_id: string;
  build_job_id: string;
  kind: 'publish' | 'rollback';
  status: string;
  revision: number;
  current_step: number;
  requester_user_id: string;
  requester_context: Actor;
  reason: string;
  test_results: string;
  target_departments: string[];
  snapshot_digest: string;
  review_policy_snapshot: Envelope;
  created_at: Date;
}
export interface DeploymentMapping {
  datasetVersionId: string;
  mapping: ReleaseMapping;
}
export interface DeploymentRow {
  mapping_snapshot: DeploymentMapping[];
  id: string;
  organization_id: string;
  app_id: string;
  app_version_id: string;
  release_request_id: string;
  status: string;
  phase: string;
  attempt: number;
  failure_code: string | null;
  artifact_digest: string;
  lease_token: string | null;
  lease_expires_at: Date | null;
  initiated_by: string;
  initiator_context: Actor;
  trace_id: string;
  created_at: Date;
}
const actorOf = (s: Subject): Actor => ({
  userId: s.userId,
  displayName: s.displayName,
  clientKind: s.clientKind,
  authenticatedAt: 0,
});
const fail = (code: string, message: string, field = 'release') =>
  new Fault(422, code, message, [{ field, reason: message }]);
export class Releases {
  constructor(
    readonly identity: Identity,
    readonly studio: StudioReleasePort,
    readonly catalog: CatalogReleasePort,
    readonly queries: ReleaseQueryPort,
  ) {}
  async event(
    tx: Sql,
    r: ReleaseRow,
    s: Pick<Subject, 'userId'>,
    event: string,
    trace: string,
    deploymentId: string | null = null,
    detail: Record<string, unknown> = {},
  ) {
    await tx.exec(
      'INSERT INTO release_events(organization_id,release_request_id,deployment_id,actor_user_id,event,trace_id,detail) VALUES($1,$2,$3,$4,$5,$6,$7)',
      [r.organization_id, r.id, deploymentId, s.userId, event, trace, JSON.stringify(detail)],
    );
  }
  async policy(tx: Sql, s: Subject, appId: string) {
    if (
      !(await tx.one('SELECT id FROM apps WHERE organization_id=$1 AND id=$2', [
        s.organizationId,
        appId,
      ]))
    )
      throw new Fault(404, 'NOT_FOUND');
    return (
      (await tx.one<S['ReleasePolicy']>(
        'SELECT revision,steps FROM release_policies WHERE organization_id=$1 AND app_id=$2',
        [s.organizationId, appId],
      )) ?? { revision: 0, steps: [] }
    );
  }
  async setPolicy(tx: Sql, s: Subject, appId: string, input: S['SetReleasePolicy']) {
    this.identity.require(s, 'release.policy.manage', true);
    await this.policy(tx, s, appId);
    await this.validateSteps(tx, s, input.steps);
    return requireValue(
      await tx.one<S['ReleasePolicy']>(
        'INSERT INTO release_policies(organization_id,app_id,steps,updated_by) VALUES($1,$2,$3,$4) ON CONFLICT(organization_id,app_id) DO UPDATE SET steps=EXCLUDED.steps,updated_by=EXCLUDED.updated_by,revision=release_policies.revision+1,updated_at=now() RETURNING revision,steps',
        [s.organizationId, appId, JSON.stringify(input.steps), s.userId],
      ),
    );
  }
  async validateSteps(tx: Sql, s: Subject, steps: S['ReleaseStep'][]) {
    if (!steps.length || new Set(steps.map((step) => step.roleKey)).size !== steps.length)
      throw fail(
        'APPROVAL_POLICY_INVALID',
        '请在申请表中选择审批人，审批阶段标识不可重复。',
        'approvalSteps',
      );
    for (const [index, step] of steps.entries()) {
      const row = await tx.one<{ display_name: string }>(
        "SELECT u.display_name FROM organization_members m JOIN users u ON u.id=m.user_id WHERE m.organization_id=$1 AND m.user_id=$2 AND m.status='active' AND u.status='active'",
        [s.organizationId, step.approverUserId],
      );
      if (!row)
        throw fail(
          'APPROVAL_REVIEWER_UNAVAILABLE',
          '所选审批人已停用或不属于当前组织，请在申请表重新选择。',
          'approvalSteps/' + index + '/approverUserId',
        );
      const reviewer = await this.identity.subject(
        tx,
        {
          userId: step.approverUserId,
          displayName: row.display_name,
          clientKind: 'human',
          authenticatedAt: 0,
        },
        s.organizationId,
      );
      if (!reviewer.actions.has('release.approve'))
        throw fail(
          'APPROVAL_REVIEWER_UNAVAILABLE',
          '所选审批人当前没有审批权限，请在申请表重新选择。',
          'approvalSteps/' + index + '/approverUserId',
        );
    }
  }
  async member(tx: Sql, org: string, userId: string): Promise<Actor> {
    const row = requireValue(
      await tx.one<{ display_name: string }>(
        "SELECT u.display_name FROM organization_members m JOIN users u ON u.id=m.user_id WHERE m.organization_id=$1 AND m.user_id=$2 AND m.status='active' AND u.status='active'",
        [org, userId],
      ),
    );
    return { userId, displayName: row.display_name, clientKind: 'human', authenticatedAt: 0 };
  }
  async access(tx: Sql, s: Subject, id: string) {
    const r = requireValue(
      await tx.one<ReleaseRow>(
        'SELECT * FROM release_requests WHERE organization_id=$1 AND id=$2',
        [s.organizationId, id],
      ),
    );
    if (
      r.requester_user_id !== s.userId &&
      !r.review_policy_snapshot.workflow?.steps.some((step) => step.approverUserId === s.userId) &&
      !s.actions.has('release.deploy') &&
      !s.actions.has('release.policy.manage')
    )
      throw new Fault(404, 'NOT_FOUND');
    return r;
  }
  async events(tx: Sql, org: string, id: string) {
    return tx.all<S['ReleaseEvent']>(
      'SELECT id,event,actor_user_id AS "actorUserId",trace_id AS "traceId",deployment_id AS "deploymentId",detail,created_at AS "createdAt" FROM release_events WHERE organization_id=$1 AND release_request_id=$2 ORDER BY created_at,id',
      [org, id],
    );
  }
  async deploymentDto(tx: Sql, d: DeploymentRow): Promise<S['Stage06Deployment']> {
    const events = await this.events(tx, d.organization_id, d.release_request_id);
    return {
      id: d.id,
      appId: d.app_id,
      appVersionId: d.app_version_id,
      releaseRequestId: d.release_request_id,
      status: d.status,
      phase: d.phase,
      attempt: d.attempt,
      failureCode: d.failure_code,
      traceId: d.trace_id,
      createdAt: d.created_at.toISOString(),
      events: events.filter((e) => e.deploymentId === d.id),
    };
  }
  async get(tx: Sql, s: Subject, id: string): Promise<S['Stage06Release']> {
    const r = await this.access(tx, s, id),
      e = r.review_policy_snapshot;
    const approvals = await tx.all<S['ReleaseApproval']>(
      'SELECT id,approver_user_id AS "approverUserId",role_key AS "roleKey",step_index AS "stepIndex",decision,comment,created_at AS "createdAt" FROM approval_records WHERE organization_id=$1 AND release_request_id=$2 ORDER BY created_at,id',
      [s.organizationId, id],
    );
    const d = await tx.one<DeploymentRow>(
      'SELECT * FROM deployments WHERE organization_id=$1 AND release_request_id=$2',
      [s.organizationId, id],
    );
    return {
      id: r.id,
      appId: r.app_id,
      appName: e.appName,
      appVersionId: r.app_version_id,
      version: e.version,
      buildJobId: r.build_job_id,
      kind: r.kind,
      status: r.status,
      revision: Number(r.revision),
      currentStep: r.current_step,
      requesterUserId: r.requester_user_id,
      reason: r.reason,
      testResults: r.test_results,
      targetDepartments: r.target_departments,
      sourceDigest: e.sourceDigest,
      snapshotDigest: r.snapshot_digest,
      manifest: e as unknown as Record<string, unknown>,
      steps: e.workflow.steps,
      approvals,
      events: await this.events(tx, s.organizationId, id),
      deployment: d ? await this.deploymentDto(tx, d) : null,
      createdAt: r.created_at.toISOString(),
    };
  }
  async list(tx: Sql, s: Subject) {
    const ids = await tx.all<{ id: string }>(
      'SELECT id FROM release_requests WHERE organization_id=$1 ORDER BY created_at DESC,id DESC',
      [s.organizationId],
    );
    const items: S['Stage06Release'][] = [];
    for (const { id } of ids)
      try {
        items.push(await this.get(tx, s, id));
      } catch (error) {
        if (!(error instanceof Fault && error.status === 404)) throw error;
      }
    return { items };
  }
  async create(
    tx: Sql,
    s: Subject,
    b: S['Stage06CreateRelease'],
    trace: string,
    rollbackTarget: string | null = null,
  ) {
    this.identity.require(s, 'release.create');
    const source = await this.studio.freeze(tx, s, b.appVersionId, b.buildJobId),
      workflow = b.approvalSteps
        ? { revision: 0, steps: b.approvalSteps }
        : await this.policy(tx, s, source.appId);
    if (!workflow.steps.length)
      throw fail('APPROVAL_POLICY_REQUIRED', '请在上线申请表中选择审批人。', 'approvalSteps');
    await this.validateSteps(tx, s, workflow.steps);
    if (workflow.steps.some((step) => step.approverUserId === s.userId))
      throw fail(
        'SELF_APPROVAL_FORBIDDEN',
        '请在申请表中选择申请人以外的审批人。',
        'approvalSteps',
      );
    const refs = source.manifest.datasetRefs;
    if (
      b.scopes.length !== refs.length ||
      new Set(b.scopes.map((scope) => scope.datasetVersionId)).size !== refs.length
    )
      throw fail('RELEASE_SCOPE_INVALID', '发布范围须与该版本引用的数据集一一对应。', 'scopes');
    const scopes: FrozenScope[] = [];
    for (const scope of b.scopes) {
      const ref = refs.find((ref) => ref.datasetVersionId === scope.datasetVersionId);
      if (!ref) throw fail('RELEASE_SCOPE_INVALID', '申请包含版本未引用的数据集。', 'scopes');
      const semantic = await this.queries.scope(tx, s, ref, scope.fieldKeys, scope.metricKeys),
        expectedSchema = await this.catalog.releaseRequirements(
          tx,
          s.organizationId,
          ref.datasetId,
          ref.datasetVersionId,
        );
      for (const binding of source.manifest.queries.filter(
        (q) => q.query.datasetVersionId === ref.datasetVersionId,
      )) {
        const q = binding.query,
          keys = [
            ...q.dimensions,
            ...q.filters.map((f) => f.fieldKey),
            ...(q.timeRange ? [q.timeRange.fieldKey] : []),
          ];
        if (
          keys.some((k) => !scope.fieldKeys.includes(k)) ||
          q.metrics.some((k) => !scope.metricKeys.includes(k))
        )
          throw fail(
            'RELEASE_SCOPE_INVALID',
            '批准范围没有覆盖版本实际使用的字段或指标。',
            'scopes',
          );
      }
      if (semantic.sensitiveFieldKeys.some((key) => !scope.sensitiveFieldKeys.includes(key)))
        throw fail(
          'SENSITIVE_FIELD_DECLARATION_REQUIRED',
          '所选敏感字段必须在申请中明确声明。',
          'sensitiveFieldKeys',
        );
      scopes.push({
        ...scope,
        maxRows: scope.maxRows ?? null,
        datasetId: ref.datasetId,
        mapping: null,
        expectedSchema,
        ...semantic,
      });
    }
    const audience = [...new Set(b.audienceUserIds)];
    for (const userId of audience) {
      await this.member(tx, s.organizationId, userId);
      if (b.targetDepartments.length) {
        const member = requireValue(
          await tx.one<{ department_codes: string[] }>(
            'SELECT department_codes FROM organization_members WHERE organization_id=$1 AND user_id=$2',
            [s.organizationId, userId],
          ),
        );
        if (!member.department_codes.some((code) => b.targetDepartments.includes(code)))
          throw fail(
            'RELEASE_AUDIENCE_INVALID',
            '目标成员不属于所声明的使用部门。',
            'audienceUserIds',
          );
      }
    }
    const id = randomUUID(),
      envelope: Envelope = {
        schemaVersion: 1,
        sourceDigest: source.sourceDigest,
        artifactId: source.artifactId,
        artifactDigest: source.artifactDigest,
        manifestDigest: digest(source.manifest),
        manifest: source.manifest,
        changes: source.changes,
        version: source.version,
        appName: source.appName,
        testResults: b.testResults,
        reason: b.reason,
        targetDepartments: b.targetDepartments,
        scopes,
        workflow,
        gateway: {
          schemaVersion: 1,
          appVersionId: source.appVersionId,
          artifactDigest: source.artifactDigest,
          scopeDigest: '',
          reportsDigest: digest(source.reports),
          audienceDigest: '',
          requiredApproverUserIds: [...new Set(workflow.steps.map((step) => step.approverUserId))],
        },
      };
    // Insert the immutable FK envelope once; its final snapshot is prepared before INSERT.
    const scopeRows = scopes
      .map((scope) => ({
        id: randomUUID(),
        organization_id: s.organizationId,
        release_request_id: id,
        dataset_version_id: scope.datasetVersionId,
        mapping_id: scope.mapping?.mappingId ?? null,
        logical_data_source_id: (scope.expectedSchema ?? scope.mapping)!.logicalDataSourceId,
        environment: 'production',
        field_keys: scope.fieldKeys,
        metric_keys: scope.metricKeys,
        row_policy_key: scope.rowPolicyKey,
        max_rows: scope.maxRows ?? null,
        max_duration_ms: scope.timeoutMs,
      }))
      .sort((a, b) => a.dataset_version_id.localeCompare(b.dataset_version_id));
    envelope.gateway.scopeDigest = digest(scopeRows);
    envelope.gateway.audienceDigest = digest(audience.sort().map((user_id) => ({ user_id })));
    await tx.exec(
      "INSERT INTO release_requests(id,organization_id,app_id,app_version_id,build_job_id,kind,rollback_target_deployment_id,requester_user_id,requester_context,reason,test_results,target_departments,status,snapshot_digest,review_policy_snapshot,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'draft',$13,$14,'infinity')",
      [
        id,
        s.organizationId,
        source.appId,
        b.appVersionId,
        b.buildJobId,
        rollbackTarget ? 'rollback' : 'publish',
        rollbackTarget,
        s.userId,
        JSON.stringify(actorOf(s)),
        b.reason,
        b.testResults,
        b.targetDepartments,
        digest(envelope),
        JSON.stringify(envelope),
      ],
    );
    for (const row of scopeRows)
      await tx.exec(
        'INSERT INTO release_scopes(id,organization_id,release_request_id,dataset_version_id,mapping_id,logical_data_source_id,environment,field_keys,metric_keys,row_policy_key,max_rows,max_duration_ms) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',
        Object.values(row),
      );
    for (const user of audience)
      await tx.exec('INSERT INTO release_audiences VALUES($1,$2,$3)', [s.organizationId, id, user]);
    const r = await this.access(tx, s, id);
    await this.event(tx, r, s, 'created', trace, null, {
      sourceDigest: source.sourceDigest,
      snapshotDigest: r.snapshot_digest,
    });
    return this.get(tx, s, id);
  }
  async submit(tx: Sql, s: Subject, id: string, trace: string) {
    const r = await this.access(tx, s, id);
    if (r.requester_user_id !== s.userId) throw new Fault(403, 'FORBIDDEN');
    if (['submitted', 'reviewing', 'approved', 'published'].includes(r.status))
      return this.get(tx, s, id);
    if (r.status !== 'draft') throw new Fault(409, 'STATE_CONFLICT');
    await this.revalidate(tx, r, false);
    await tx.exec(
      "UPDATE release_requests SET status='submitted',submitted_at=now(),revision=revision+1 WHERE organization_id=$1 AND id=$2",
      [s.organizationId, id],
    );
    await this.event(tx, r, s, 'submitted', trace);
    return this.get(tx, s, id);
  }
  async cancel(tx: Sql, s: Subject, id: string, trace: string) {
    const r = await this.access(tx, s, id);
    if (r.requester_user_id !== s.userId) throw new Fault(403, 'FORBIDDEN');
    if (r.status === 'withdrawn') return this.get(tx, s, id);
    if (!['draft', 'submitted', 'reviewing'].includes(r.status))
      throw new Fault(409, 'STATE_CONFLICT', '当前状态不能撤回，发布中的申请须等待部署结果。');
    await tx.exec(
      "UPDATE release_requests SET status='withdrawn',revision=revision+1 WHERE organization_id=$1 AND id=$2",
      [s.organizationId, id],
    );
    await this.event(tx, r, s, 'withdrawn', trace);
    return this.get(tx, s, id);
  }
  async approve(tx: Sql, s: Subject, id: string, input: S['Stage06Approval'], trace: string) {
    this.identity.require(s, 'release.approve', true);
    const r = await this.access(tx, s, id);
    if (s.userId === r.requester_user_id) throw new Fault(403, 'SELF_APPROVAL_FORBIDDEN');
    const prior = await tx.one<{ decision: string; approver_user_id: string }>(
      'SELECT decision,approver_user_id FROM approval_records WHERE organization_id=$1 AND release_request_id=$2 AND step_index=$3',
      [s.organizationId, id, input.stepIndex],
    );
    if (prior) {
      if (prior.approver_user_id !== s.userId || prior.decision !== input.decision)
        throw new Fault(409, 'STATE_CONFLICT');
      return this.get(tx, s, id);
    }
    if (!['submitted', 'reviewing'].includes(r.status)) throw new Fault(409, 'STATE_CONFLICT');
    const step = r.review_policy_snapshot.workflow.steps[r.current_step];
    if (input.stepIndex !== r.current_step || step?.approverUserId !== s.userId)
      throw new Fault(403, 'APPROVAL_OUT_OF_ORDER', '当前审批阶段不属于此用户。');
    await tx.exec(
      'INSERT INTO approval_records(organization_id,release_request_id,requester_user_id,approver_user_id,decision,comment,snapshot_digest,step_index,role_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [
        s.organizationId,
        id,
        r.requester_user_id,
        s.userId,
        input.decision,
        input.comment,
        r.snapshot_digest,
        r.current_step,
        step.roleKey,
      ],
    );
    const next = r.current_step + 1,
      status =
        input.decision === 'reject'
          ? 'rejected'
          : next === r.review_policy_snapshot.workflow.steps.length
            ? 'approved'
            : 'reviewing';
    await tx.exec(
      'UPDATE release_requests SET status=$3,current_step=$4,revision=revision+1 WHERE organization_id=$1 AND id=$2',
      [s.organizationId, id, status, next],
    );
    await this.event(
      tx,
      r,
      s,
      input.decision === 'reject' ? 'rejected' : 'step_approved',
      trace,
      null,
      { stepIndex: r.current_step, roleKey: step.roleKey, status },
    );
    return this.get(tx, s, id);
  }
  async revalidate(tx: Sql, r: ReleaseRow, approved = true): Promise<ReleaseSource> {
    const e = r.review_policy_snapshot;
    if (digest(e) !== r.snapshot_digest)
      throw fail('RELEASE_CONTENT_CHANGED', '审批清单摘要不一致。');
    if (approved && !['approved', 'publishing', 'published', 'failed'].includes(r.status))
      throw new Fault(403, 'RELEASE_NOT_APPROVED', '此版本尚未完成审批。');
    const requester = await this.identity.subject(tx, r.requester_context, r.organization_id);
    this.identity.require(requester, 'release.create');
    const source = await this.studio.freeze(tx, requester, r.app_version_id, r.build_job_id);
    if (
      source.sourceDigest !== e.sourceDigest ||
      source.artifactDigest !== e.artifactDigest ||
      source.artifactId !== e.artifactId ||
      digest(source.manifest) !== e.manifestDigest ||
      digest(source.reports) !== e.gateway.reportsDigest
    )
      throw fail('RELEASE_CONTENT_CHANGED', '当前封存内容与审批清单不一致。');
    for (const scope of e.scopes) {
      const semantic = await this.queries.scope(
        tx,
        requester,
        { datasetId: scope.datasetId, datasetVersionId: scope.datasetVersionId },
        scope.fieldKeys,
        scope.metricKeys,
      );
      if (semantic.policyId !== scope.policyId || semantic.policyDigest !== scope.policyDigest)
        throw fail(
          'RELEASE_POLICY_CHANGED',
          '申请中的数据策略已变化，请按当前策略重新申请。',
          'scopes',
        );
      if (scope.expectedSchema) {
        const requirements = await this.catalog.releaseRequirements(
          tx,
          r.organization_id,
          scope.datasetId,
          scope.datasetVersionId,
        );
        if (canonical(requirements) !== canonical(scope.expectedSchema))
          throw fail('RELEASE_CONTENT_CHANGED', '数据集版本的冻结结构已变化。', 'scopes');
      }
      if (scope.mapping) {
        const mapping = await this.catalog.releaseMapping(
          tx,
          r.organization_id,
          scope.datasetId,
          scope.datasetVersionId,
        );
        if (canonical(mapping) !== canonical(scope.mapping))
          throw fail(
            'RELEASE_POLICY_CHANGED',
            '历史申请绑定的生产映射已变化，请重新申请。',
            'scopes',
          );
      }
    }
    const scopes = await tx.all(
        'SELECT * FROM release_scopes WHERE organization_id=$1 AND release_request_id=$2 ORDER BY dataset_version_id',
        [r.organization_id, r.id],
      ),
      audience = await tx.all(
        'SELECT user_id FROM release_audiences WHERE organization_id=$1 AND release_request_id=$2 ORDER BY user_id',
        [r.organization_id, r.id],
      );
    if (digest(scopes) !== e.gateway.scopeDigest || digest(audience) !== e.gateway.audienceDigest)
      throw fail('RELEASE_CONTENT_CHANGED', '发布数据范围或使用成员与审批清单不一致。');
    for (const step of e.workflow.steps) {
      const actor = await this.member(tx, r.organization_id, step.approverUserId);
      this.identity.require(
        await this.identity.subject(tx, actor, r.organization_id),
        'release.approve',
        true,
      );
    }
    if (approved) {
      const records = await tx.all<{
        step_index: number;
        approver_user_id: string;
        decision: string;
        snapshot_digest: string;
      }>(
        'SELECT * FROM approval_records WHERE organization_id=$1 AND release_request_id=$2 ORDER BY step_index',
        [r.organization_id, r.id],
      );
      if (
        records.length !== e.workflow.steps.length ||
        e.workflow.steps.some(
          (step, index) =>
            !records.some(
              (a) =>
                a.step_index === index &&
                a.approver_user_id === step.approverUserId &&
                a.decision === 'approve' &&
                a.snapshot_digest === r.snapshot_digest,
            ),
        )
      )
        throw new Fault(403, 'RELEASE_NOT_APPROVED');
    }
    return source;
  }
  async resolveMappings(tx: Sql, r: ReleaseRow): Promise<DeploymentMapping[]> {
    const bindings: DeploymentMapping[] = [];
    for (const scope of r.review_policy_snapshot.scopes) {
      const mapping = await this.catalog.releaseMapping(
          tx,
          r.organization_id,
          scope.datasetId,
          scope.datasetVersionId,
        ),
        expected = scope.expectedSchema ?? scope.mapping;
      if (
        !expected ||
        mapping.logicalDataSourceId !== expected.logicalDataSourceId ||
        canonical(mapping.relation) !== canonical(expected.relation) ||
        expected.columns.some(
          (column) =>
            !mapping.columns.some(
              (actual) =>
                actual.name === column.name &&
                actual.dbType === column.dbType &&
                actual.nullable === column.nullable,
            ),
        )
      )
        throw fail('SCHEMA_INCOMPATIBLE', '当前生产结构与本次审批的数据集结构不兼容。', 'scopes');
      if (scope.mapping && canonical(scope.mapping) !== canonical(mapping))
        throw fail('RELEASE_POLICY_CHANGED', '历史审批的生产映射已变化。', 'scopes');
      bindings.push({ datasetVersionId: scope.datasetVersionId, mapping });
    }
    return bindings;
  }
  async deploymentMappings(tx: Sql, d: DeploymentRow, r: ReleaseRow) {
    const mappings = await this.resolveMappings(tx, r);
    if (canonical(mappings) !== canonical(d.mapping_snapshot))
      throw fail('RELEASE_POLICY_CHANGED', '部署绑定的生产映射已变化，请重新提交发布。', 'scopes');
    return mappings;
  }
  async deploy(tx: Sql, s: Subject, id: string, trace: string) {
    this.identity.require(s, 'release.deploy', true);
    const r = await this.access(tx, s, id),
      old = await tx.one<DeploymentRow>(
        'SELECT * FROM deployments WHERE organization_id=$1 AND release_request_id=$2',
        [s.organizationId, id],
      );
    if (old) return this.deploymentDto(tx, old);
    await this.revalidate(tx, r);
    const mappingSnapshot = await this.resolveMappings(tx, r);
    const d = requireValue(
      await tx.one<DeploymentRow>(
        "INSERT INTO deployments(organization_id,app_id,app_version_id,release_request_id,status,artifact_digest,initiated_by,initiator_context,trace_id,previous_deployment_id,mapping_snapshot) VALUES($1,$2,$3,$4,'queued',$5,$6,$7,$8,(SELECT deployment_id FROM deployment_slots WHERE organization_id=$1 AND app_id=$2 AND environment='production'),$9) RETURNING *",
        [
          s.organizationId,
          r.app_id,
          r.app_version_id,
          id,
          r.review_policy_snapshot.artifactDigest,
          s.userId,
          JSON.stringify(actorOf(s)),
          trace,
          JSON.stringify(mappingSnapshot),
        ],
      ),
    );
    await tx.exec(
      "UPDATE release_requests SET status='publishing',revision=revision+1 WHERE organization_id=$1 AND id=$2",
      [s.organizationId, id],
    );
    await this.event(tx, r, s, 'deployment_queued', trace, d.id);
    return this.deploymentDto(tx, d);
  }
  async retry(tx: Sql, s: Subject, id: string, trace: string) {
    this.identity.require(s, 'release.deploy', true);
    const d = requireValue(
        await tx.one<DeploymentRow>(
          'SELECT * FROM deployments WHERE organization_id=$1 AND id=$2',
          [s.organizationId, id],
        ),
      ),
      r = await this.access(tx, s, d.release_request_id);
    if (d.status !== 'failed') return this.deploymentDto(tx, d);
    await this.revalidate(tx, r);
    await this.deploymentMappings(tx, d, r);
    await tx.exec(
      "UPDATE deployments SET status='queued',phase='queued',failure_code=NULL,lease_token=NULL,lease_expires_at=NULL,initiated_by=$3,initiator_context=$4 WHERE organization_id=$1 AND id=$2",
      [s.organizationId, id, s.userId, JSON.stringify(actorOf(s))],
    );
    await tx.exec(
      "UPDATE release_requests SET status='publishing',revision=revision+1 WHERE organization_id=$1 AND id=$2",
      [s.organizationId, r.id],
    );
    await this.event(tx, r, s, 'deployment_retried', trace, id);
    return this.deploymentDto(tx, { ...d, status: 'queued', phase: 'queued', failure_code: null });
  }
  async rollback(tx: Sql, s: Subject, appId: string, input: S['Stage06Rollback'], trace: string) {
    const target = requireValue(
        await tx.one<DeploymentRow>(
          "SELECT * FROM deployments WHERE organization_id=$1 AND id=$2 AND app_id=$3 AND status IN('active','superseded')",
          [s.organizationId, input.targetDeploymentId, appId],
        ),
      ),
      old = requireValue(
        await tx.one<ReleaseRow>(
          'SELECT * FROM release_requests WHERE organization_id=$1 AND id=$2',
          [s.organizationId, target.release_request_id],
        ),
      );
    await this.revalidate(tx, old);
    const audience = await tx.all<{ user_id: string }>(
      'SELECT user_id FROM release_audiences WHERE organization_id=$1 AND release_request_id=$2',
      [s.organizationId, old.id],
    );
    return this.create(
      tx,
      s,
      {
        appVersionId: old.app_version_id,
        buildJobId: old.build_job_id,
        reason: input.reason,
        testResults: input.testResults,
        targetDepartments: old.target_departments,
        audienceUserIds: audience.map((a) => a.user_id),
        approvalSteps: input.approvalSteps ?? old.review_policy_snapshot.workflow.steps,
        scopes: old.review_policy_snapshot.scopes.map((scope) => ({
          datasetVersionId: scope.datasetVersionId,
          fieldKeys: scope.fieldKeys,
          metricKeys: scope.metricKeys,
          sensitiveFieldKeys: scope.sensitiveFieldKeys,
          maxRows: scope.maxRows ?? null,
        })),
      },
      trace,
      target.id,
    );
  }
  async activate(tx: Sql, d: DeploymentRow, r: ReleaseRow, attestation: DeploymentAttestation) {
    await this.revalidate(tx, r);
    const mappings = await this.deploymentMappings(tx, d, r),
      e = r.review_policy_snapshot;
    if (
      attestation.deploymentId !== d.id ||
      attestation.profile !== 'opaque-static-v1' ||
      attestation.health !== 'passed' ||
      attestation.artifactDigest !== e.artifactDigest ||
      attestation.sourceDigest !== e.sourceDigest ||
      attestation.manifestDigest !== e.manifestDigest
    )
      throw fail('DEPLOYMENT_ATTESTATION_INVALID', '部署服务凭证与审批版本不一致。');
    const operator = await this.identity.subject(tx, d.initiator_context, r.organization_id);
    this.identity.require(operator, 'release.deploy', true);
    const audience = await tx.all<{ user_id: string }>(
      'SELECT user_id FROM release_audiences WHERE organization_id=$1 AND release_request_id=$2',
      [r.organization_id, r.id],
    );
    for (const { user_id } of audience) {
      const viewer = await this.identity.subject(
        tx,
        await this.member(tx, r.organization_id, user_id),
        r.organization_id,
      );
      this.identity.require(viewer, 'app.view');
      for (const scope of e.scopes) {
        const read = await this.identity
          .queryGrant(tx, viewer, scope.datasetId, 'dataset.read')
          .catch((error) => {
            if (error instanceof Fault && error.status === 404)
              throw new Fault(
                422,
                'RELEASE_AUDIENCE_DATA_ACCESS_REQUIRED',
                '发布失败：目标成员 ' + viewer.displayName + ' 尚未获得所需数据集的读取授权。',
                [
                  { field: 'audienceUserIds', reason: viewer.userId },
                  { field: 'datasetId', reason: scope.datasetId },
                ],
              );
            throw error;
          });
        await this.identity.issueReleaseGrant(
          tx,
          viewer,
          scope.datasetId,
          'dataset.query.production',
          scope.fieldKeys.filter((k) => read.fieldKeys.includes(k)),
          scope.metricKeys.filter((k) => read.metricKeys.includes(k)),
          read.expiresAt,
        );
      }
      await this.identity.issueReleaseGrant(tx, viewer, r.app_id, 'app.view');
      if (e.manifest.report)
        await this.identity.issueReleaseGrant(
          tx,
          viewer,
          e.manifest.report.reportId,
          'report.view',
        );
    }
    await tx.exec(
      'INSERT INTO deployment_artifacts(organization_id,deployment_id,artifact_id,artifact_digest,attestation,attestation_digest) VALUES($1,$2,$3,$4,$5,$6)',
      [
        r.organization_id,
        d.id,
        e.artifactId,
        e.artifactDigest,
        JSON.stringify(attestation),
        digest(attestation),
      ],
    );
    const epoch = requireValue(
      await tx.one<{ policy_epoch: number }>('SELECT policy_epoch FROM organizations WHERE id=$1', [
        r.organization_id,
      ]),
    );
    await tx.exec(
      "UPDATE runtime_grants SET status='revoked' WHERE organization_id=$1 AND deployment_id IN(SELECT deployment_id FROM deployment_slots WHERE organization_id=$1 AND app_id=$2)",
      [r.organization_id, r.app_id],
    );
    await tx.exec(
      "UPDATE deployments SET status='superseded' WHERE organization_id=$1 AND app_id=$2 AND status='active'",
      [r.organization_id, r.app_id],
    );
    for (const binding of mappings)
      await tx.exec(
        "INSERT INTO runtime_grants(organization_id,deployment_id,release_request_id,release_scope_id,dataset_version_id,mapping_id,status,policy_epoch,expires_at) SELECT organization_id,$3,release_request_id,id,dataset_version_id,$5,'active',$4,'infinity' FROM release_scopes WHERE organization_id=$1 AND release_request_id=$2 AND dataset_version_id=$6",
        [
          r.organization_id,
          r.id,
          d.id,
          epoch.policy_epoch,
          binding.mapping.mappingId,
          binding.datasetVersionId,
        ],
      );
    await tx.exec(
      "UPDATE deployments SET status='active',phase='active',lease_token=NULL,lease_expires_at=NULL WHERE organization_id=$1 AND id=$2",
      [r.organization_id, d.id],
    );
    await tx.exec(
      "INSERT INTO deployment_slots(organization_id,app_id,environment,deployment_id) VALUES($1,$2,'production',$3) ON CONFLICT(organization_id,app_id,environment) DO UPDATE SET deployment_id=EXCLUDED.deployment_id,revision=deployment_slots.revision+1",
      [r.organization_id, r.app_id, d.id],
    );
    await tx.exec(
      "UPDATE release_requests SET status='published',revision=revision+1 WHERE organization_id=$1 AND id=$2",
      [r.organization_id, r.id],
    );
    await this.event(tx, r, operator, 'activated', d.trace_id, d.id, {
      artifactDigest: e.artifactDigest,
      previousVersionRetained: true,
    });
  }
}
