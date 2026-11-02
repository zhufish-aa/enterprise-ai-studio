import { createHash } from 'node:crypto';
import { digest } from '@eas/connector-transport';
import type { components, DeploymentAttestation } from '@eas/api-contract';
import type { Sql } from '../infrastructure/database.js';
import type { Identity, Subject } from '../identity/identity.js';
import { Fault } from '../infrastructure/errors.js';
type S = components['schemas'];
export interface RuntimeQueryContext {
  kind: 'app' | 'report';
  resourceId: string;
  reportVersionId?: string;
  queryKey?: string;
}
interface Deployment {
  mapping_snapshot: import('./service.js').DeploymentMapping[];
  id: string;
  app_id: string;
  app_version_id: string;
  release_request_id: string;
  artifact_digest: string;
  build_job_id: string;
  snapshot_digest: string;
  review_policy_snapshot: {
    sourceDigest?: string;
    manifestDigest?: string;
    targetDepartments?: string[];
    workflow?: { steps: S['ReleaseStep'][] };
    gateway?: {
      schemaVersion: number;
      appVersionId: string;
      artifactDigest: string;
      scopeDigest: string;
      reportsDigest: string;
      audienceDigest: string;
      requiredApproverUserIds: string[];
    };
  };
  requester_user_id: string;
  manifest: S['SourceManifest'];
  source_digest: string;
  artifact_id: string;
  attestation: DeploymentAttestation;
  attestation_digest: string;
}
interface Scope {
  id: string;
  dataset_version_id: string;
  mapping_id: string | null;
  field_keys: string[];
  metric_keys: string[];
  row_policy_key: string;
  max_rows: number | null;
  max_duration_ms: number;
}
/** Reads only server-owned review, deployment and current permission facts. */
export class RuntimeQueryAccess {
  constructor(private readonly identity: Identity) {}
  async checkContext(tx: Sql, s: Subject, c: RuntimeQueryContext) {
    await this.deployment(tx, s, c);
  }
  private deny(): never {
    throw new Fault(
      403,
      'PRODUCTION_AUTHORIZATION_REQUIRED',
      '当前版本缺少有效的生产发布授权，或当前访问权限已变化。',
    );
  }
  private async deployment(tx: Sql, s: Subject, c: RuntimeQueryContext): Promise<Deployment> {
    const appId =
      c.kind === 'app'
        ? c.resourceId
        : (
            await tx.one<{ app_id: string }>(
              'SELECT app_id FROM reports WHERE organization_id=$1 AND id=$2',
              [s.organizationId, c.resourceId],
            )
          )?.app_id;
    if (!appId) return this.deny();
    const d = await tx.one<Deployment>(
      `SELECT d.*,r.build_job_id,r.snapshot_digest,r.review_policy_snapshot,r.requester_user_id,v.manifest,v.source_digest,a.artifact_id,a.attestation,a.attestation_digest FROM deployment_slots slot JOIN deployments d ON d.organization_id=slot.organization_id AND d.id=slot.deployment_id JOIN release_requests r ON r.organization_id=d.organization_id AND r.id=d.release_request_id JOIN app_versions v ON v.organization_id=d.organization_id AND v.id=d.app_version_id JOIN build_jobs b ON b.organization_id=r.organization_id AND b.id=r.build_job_id JOIN artifacts sealed ON sealed.organization_id=b.organization_id AND sealed.id=b.artifact_id AND sealed.status='sealed' AND sealed.digest=b.artifact_digest JOIN deployment_artifacts a ON a.organization_id=d.organization_id AND a.deployment_id=d.id AND a.artifact_digest=d.artifact_digest AND a.artifact_id=b.artifact_id WHERE slot.organization_id=$1 AND slot.app_id=$2 AND slot.environment='production' AND d.status='active' AND r.status IN('approved','published') AND r.expires_at>now() AND b.status='succeeded' AND b.app_version_id=d.app_version_id AND b.artifact_digest=d.artifact_digest`,
      [s.organizationId, appId],
    );
    if (
      !d ||
      digest(d.attestation) !== d.attestation_digest ||
      d.attestation.profile !== 'opaque-static-v1' ||
      d.attestation.health !== 'passed' ||
      d.attestation.deploymentId !== d.id ||
      d.attestation.sourceDigest !== d.source_digest ||
      d.attestation.manifestDigest !== digest(d.manifest) ||
      d.attestation.artifactDigest !== d.artifact_digest
    )
      return this.deny();
    return d;
  }
  private async facts(tx: Sql, s: Subject, d: Deployment) {
    const org = s.organizationId;
    try {
      await this.identity.queryGrant(tx, s, d.app_id, 'app.view');
    } catch {
      return this.deny();
    }
    if (d.manifest.report)
      try {
        await this.identity.queryGrant(tx, s, d.manifest.report.reportId, 'report.view');
      } catch {
        return this.deny();
      }
    const audience = await tx.all<{ user_id: string }>(
      'SELECT user_id FROM release_audiences WHERE organization_id=$1 AND release_request_id=$2 ORDER BY user_id',
      [org, d.release_request_id],
    );
    if (!audience.some((a) => a.user_id === s.userId)) return this.deny();
    const departments = d.review_policy_snapshot.targetDepartments;
    if (
      departments?.length &&
      !(await this.identity.dataScope(tx, s)).some((code) => departments.includes(code))
    )
      return this.deny();
    const scopes = await tx.all<Scope>(
      'SELECT * FROM release_scopes WHERE organization_id=$1 AND release_request_id=$2 ORDER BY dataset_version_id',
      [org, d.release_request_id],
    );
    const reports = await tx.all<{
      id: string;
      config: unknown;
      config_digest: string;
      query_key: string;
      query_spec: unknown;
    }>(
      `SELECT v.id,v.config,v.config_digest,b.query_key,b.query_spec FROM app_version_reports a JOIN report_versions v ON v.organization_id=a.organization_id AND v.id=a.report_version_id JOIN report_version_datasets b ON b.organization_id=v.organization_id AND b.report_version_id=v.id WHERE a.organization_id=$1 AND a.app_version_id=$2 ORDER BY v.id,b.query_key`,
      [org, d.app_version_id],
    );
    const envelope = d.review_policy_snapshot.gateway;
    if (
      !envelope ||
      envelope.schemaVersion !== 1 ||
      envelope.appVersionId !== d.app_version_id ||
      envelope.artifactDigest !== d.artifact_digest ||
      d.snapshot_digest !== digest(d.review_policy_snapshot) ||
      envelope.scopeDigest !== digest(scopes) ||
      envelope.audienceDigest !== digest(audience) ||
      envelope.reportsDigest !== digest(reports) ||
      reports.some((r) => r.config_digest !== digest(r.config))
    )
      return this.deny();
    const required = envelope.requiredApproverUserIds,
      steps = d.review_policy_snapshot.workflow?.steps;
    if (
      !Array.isArray(required) ||
      !required.length ||
      required.includes(d.requester_user_id) ||
      (!steps && new Set(required).size < 2)
    )
      return this.deny();
    const approvals = await tx.all<{
      approver_user_id: string;
      step_index: number | null;
      role_key: string | null;
    }>(
      `SELECT a.approver_user_id,a.step_index,a.role_key FROM approval_records a JOIN organization_members m ON m.organization_id=a.organization_id AND m.user_id=a.approver_user_id JOIN users u ON u.id=m.user_id WHERE a.organization_id=$1 AND a.release_request_id=$2 AND a.decision='approve' AND a.snapshot_digest=$3 AND m.status='active' AND u.status='active' AND EXISTS(SELECT 1 FROM role_bindings b JOIN role_permissions p ON p.organization_id=b.organization_id AND p.role_id=b.role_id WHERE b.organization_id=m.organization_id AND b.user_id=m.user_id AND p.permission_key='release.approve')`,
      [org, d.release_request_id, d.snapshot_digest],
    );
    if (
      required.some((id) => !approvals.some((a) => a.approver_user_id === id)) ||
      steps?.some(
        (step, index) =>
          !approvals.some(
            (a) =>
              a.step_index === index &&
              a.approver_user_id === step.approverUserId &&
              a.role_key === step.roleKey,
          ),
      )
    )
      return this.deny();
    if (
      await tx.one(
        "SELECT id FROM approval_records WHERE organization_id=$1 AND release_request_id=$2 AND decision='reject'",
        [org, d.release_request_id],
      )
    )
      return this.deny();
    return { scopes, reports };
  }
  async site(tx: Sql, s: Subject, appId: string): Promise<S['StudioPreview']> {
    const d = await this.deployment(tx, s, { kind: 'app', resourceId: appId });
    await this.facts(tx, s, d);
    const blob = await tx.one<{ content: Buffer }>(
      'SELECT content FROM studio_artifact_blobs WHERE organization_id=$1 AND artifact_id=$2',
      [s.organizationId, d.artifact_id],
    );
    if (
      !blob ||
      'sha256:' + createHash('sha256').update(blob.content).digest('hex') !== d.artifact_digest
    )
      return this.deny();
    return {
      appId,
      versionId: d.app_version_id,
      buildId: d.build_job_id,
      environment: 'production',
      manifest: d.manifest,
      html: blob.content.toString(),
    };
  }
  async reportQuery(
    tx: Sql,
    s: Subject,
    c: RuntimeQueryContext,
    input: S['CreateReportQuery'],
  ): Promise<{ query: S['QuerySpec']; context: RuntimeQueryContext }> {
    const d = await this.deployment(tx, s, c),
      row = await tx.one<{ id: string; query_spec: S['QuerySpec']; dataset_version_id: string }>(
        `SELECT v.id,b.query_spec,b.dataset_version_id FROM app_version_reports a JOIN report_versions v ON v.organization_id=a.organization_id AND v.id=a.report_version_id JOIN report_version_datasets b ON b.organization_id=v.organization_id AND b.report_version_id=v.id WHERE a.organization_id=$1 AND a.app_version_id=$2 AND v.report_id=$3 AND b.query_key=$4`,
        [s.organizationId, d.app_version_id, c.resourceId, input.queryKey],
      );
    if (!row) return this.deny();
    return {
      query: {
        ...row.query_spec,
        datasetVersionId: row.dataset_version_id,
        filters: [...row.query_spec.filters, ...input.filters],
      },
      context: { ...c, reportVersionId: row.id, queryKey: input.queryKey },
    };
  }
  async authorize(
    tx: Sql,
    s: Subject,
    c: RuntimeQueryContext,
    versionId: string,
    policyKey: string,
  ) {
    const d = await this.deployment(tx, s, c),
      { scopes, reports } = await this.facts(tx, s, d),
      org = s.organizationId;
    if (c.kind === 'report') {
      try {
        await this.identity.queryGrant(tx, s, c.resourceId, 'report.view');
      } catch {
        return this.deny();
      }
      if (!reports.some((r) => r.id === c.reportVersionId && r.query_key === c.queryKey))
        return this.deny();
    }
    const scope = scopes.find((scope) => scope.dataset_version_id === versionId);
    if (!scope || scope.row_policy_key !== policyKey) return this.deny();
    const binding = d.mapping_snapshot.find((binding) => binding.datasetVersionId === versionId);
    if (!binding || (scope.mapping_id && scope.mapping_id !== binding.mapping.mappingId))
      return this.deny();
    const mappingId = binding.mapping.mappingId;
    const grant = await tx.one<{ id: string }>(
      `SELECT g.id FROM runtime_grants g JOIN organizations o ON o.id=g.organization_id WHERE g.organization_id=$1 AND g.deployment_id=$2 AND g.release_request_id=$3 AND g.release_scope_id=$4 AND g.dataset_version_id=$5 AND g.mapping_id=$6 AND g.status='active' AND g.expires_at>now() AND g.policy_epoch=o.policy_epoch`,
      [org, d.id, d.release_request_id, scope.id, versionId, mappingId],
    );
    if (!grant) return this.deny();
    return {
      appId: d.app_id,
      appVersionId: d.app_version_id,
      releaseRequestId: d.release_request_id,
      reportId: c.kind === 'report' ? c.resourceId : null,
      reportVersionId: c.reportVersionId ?? null,
      deploymentId: d.id,
      runtimeGrantId: grant.id,
      mappingId,
      fields: scope.field_keys,
      metrics: scope.metric_keys,
      maxRows: scope.max_rows,
      timeoutMs: scope.max_duration_ms,
    };
  }
}
