import { randomUUID } from 'node:crypto';
import type {
  DeploymentAttestation,
  ReleaseInspection,
  ReleaseInspectionResult,
} from '@eas/api-contract';
import { signedRequest } from '@eas/connector-transport';
import type { Database, Sql } from '../infrastructure/database.js';
import type { WorkerTarget } from '../infrastructure/worker-target.js';
import { Fault, requireValue } from '../infrastructure/errors.js';
import { Releases, type ReleaseRow, type DeploymentRow } from './service.js';
export class Deployments {
  private timer: ReturnType<typeof setInterval> | undefined;
  private task: Promise<void> | undefined;
  private stopped = false;
  constructor(
    private readonly db: Database,
    private readonly releases: Releases,
    private readonly worker: WorkerTarget | undefined,
    private readonly production: WorkerTarget | undefined,
  ) {}
  start() {
    this.timer = setInterval(() => {
      if (!this.stopped && !this.task)
        this.task = this.tick()
          .catch(() => {})
          .finally(() => {
            this.task = undefined;
          });
    }, 300);
    this.timer.unref();
  }
  async close() {
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
    await this.task;
  }
  async inspection(tx: Sql, org: string, id: string, token: string): Promise<ReleaseInspection> {
    const d = requireValue(
        await tx.one<DeploymentRow>(
          "SELECT * FROM deployments WHERE organization_id=$1 AND id=$2 AND lease_token=$3 AND lease_expires_at>now() AND status='validating'",
          [org, id, token],
        ),
      ),
      r = requireValue(
        await tx.one<ReleaseRow>(
          'SELECT * FROM release_requests WHERE organization_id=$1 AND id=$2',
          [org, d.release_request_id],
        ),
      );
    await this.releases.revalidate(tx, r);
    const bindings = await this.releases.deploymentMappings(tx, d, r);
    const plans = [];
    for (const scope of r.review_policy_snapshot.scopes) {
      const base = await this.releases.catalog.releaseInspection(
        tx,
        org,
        scope.datasetId,
        scope.datasetVersionId,
        bindings.find((binding) => binding.datasetVersionId === scope.datasetVersionId)!.mapping
          .mappingId,
      );
      plans.push({
        ...base,
        jobId: scope.datasetVersionId,
        organizationId: org,
        attempt: d.attempt,
        expiresAt: d.lease_expires_at!.toISOString(),
      });
    }
    return { deploymentId: id, leaseToken: token, plans };
  }
  private async phase(org: string, id: string, token: string, phase: string) {
    return this.db.tenant(org, async (tx) => {
      await tx.one('SELECT id FROM organizations WHERE id=$1 FOR UPDATE', [org]);
      const d = await tx.one<DeploymentRow>(
        'SELECT * FROM deployments WHERE organization_id=$1 AND id=$2 AND lease_token=$3 AND lease_expires_at>now()',
        [org, id, token],
      );
      if (!d) throw new Fault(409, 'DEPLOYMENT_LEASE_LOST');
      const r = requireValue(
        await tx.one<ReleaseRow>(
          'SELECT * FROM release_requests WHERE organization_id=$1 AND id=$2',
          [org, d.release_request_id],
        ),
      );
      const source = await this.releases.revalidate(tx, r);
      await this.releases.deploymentMappings(tx, d, r);
      await tx.exec(
        "UPDATE deployments SET phase=$4,status='deploying' WHERE organization_id=$1 AND id=$2 AND lease_token=$3",
        [org, id, token, phase],
      );
      await this.releases.event(tx, r, { userId: d.initiated_by }, phase, d.trace_id, id);
      return { r, d, source };
    });
  }
  private async tick() {
    for (const org of await this.db.global.all<{ id: string }>('SELECT id FROM organizations')) {
      if (this.stopped) return;
      const claim = await this.db.tenant(org.id, async (tx) => {
        await tx.one('SELECT id FROM organizations WHERE id=$1 FOR UPDATE', [org.id]);
        await tx.exec(
          "UPDATE deployments SET status='queued',phase='resuming',lease_token=NULL,lease_expires_at=NULL WHERE organization_id=$1 AND status IN('validating','deploying') AND lease_expires_at<now()",
          [org.id],
        );
        const d = await tx.one<DeploymentRow>(
          "SELECT * FROM deployments WHERE organization_id=$1 AND status='queued' ORDER BY created_at,id LIMIT 1 FOR UPDATE",
          [org.id],
        );
        if (!d) return null;
        const token = randomUUID();
        await tx.exec(
          "UPDATE deployments SET status='validating',phase='manifest_validation',attempt=attempt+1,lease_token=$3,lease_expires_at=now()+interval '2 minutes' WHERE organization_id=$1 AND id=$2",
          [org.id, d.id, token],
        );
        const r = requireValue(
          await tx.one<ReleaseRow>(
            'SELECT * FROM release_requests WHERE organization_id=$1 AND id=$2',
            [org.id, d.release_request_id],
          ),
        );
        await this.releases.event(
          tx,
          r,
          { userId: d.initiated_by },
          'manifest_validation',
          d.trace_id,
          d.id,
        );
        return { d, r, token };
      });
      if (!claim) continue;
      const { d, r, token } = claim;
      try {
        const prepared = await this.db.tenant(org.id, async (tx) => {
          const request = requireValue(
            await tx.one<ReleaseRow>(
              'SELECT * FROM release_requests WHERE organization_id=$1 AND id=$2',
              [org.id, r.id],
            ),
          );
          const operator = await this.releases.identity.subject(tx, d.initiator_context, org.id);
          this.releases.identity.require(operator, 'release.deploy', true);
          await this.releases.deploymentMappings(tx, d, request);
          return this.releases.revalidate(tx, request);
        });
        if (r.review_policy_snapshot.scopes.length) {
          if (!this.production)
            throw new Fault(
              503,
              'PRODUCTION_CONNECTOR_NOT_CONFIGURED',
              '尚未配置生产连接执行服务。',
            );
          const p = this.production;
          const result = await signedRequest<ReleaseInspectionResult>(
            new URL('/release/inspect', p.url),
            p.key,
            { organizationId: org.id, deploymentId: d.id, leaseToken: token },
            { tls: p.tls, allowLocalHttp: p.allowLocalHttp, timeoutMs: 35000 },
          );
          if (
            result.deploymentId !== d.id ||
            result.leaseToken !== token ||
            result.results.length !== r.review_policy_snapshot.scopes.length
          )
            throw new Fault(422, 'SCHEMA_INCOMPATIBLE');
          for (const binding of d.mapping_snapshot) {
            const scope = { datasetVersionId: binding.datasetVersionId, mapping: binding.mapping };
            const actual = result.results
              .find((result) => result.datasetVersionId === scope.datasetVersionId)
              ?.relations.find(
                (relation) =>
                  relation.schema === scope.mapping.relation.schema &&
                  relation.name === scope.mapping.relation.name,
              );
            if (!actual) throw new Fault(422, 'SCHEMA_INCOMPATIBLE');
            for (const column of scope.mapping.columns) {
              const current = actual.columns.find((c) => c.name === column.name);
              if (
                !current ||
                current.dbType !== column.dbType ||
                current.nullable !== column.nullable
              )
                throw new Fault(422, 'SCHEMA_INCOMPATIBLE', '生产数据库当前结构与批准结构不兼容。');
            }
          }
        }
        if (!this.worker)
          throw new Fault(503, 'DEPLOYMENT_WORKER_NOT_CONFIGURED', '尚未配置受控部署服务。');
        const w = this.worker;
        await this.phase(org.id, d.id, token, 'artifact_preparation');
        const input = {
          deploymentId: d.id,
          sourceDigest: prepared.sourceDigest,
          manifestDigest: r.review_policy_snapshot.manifestDigest,
          artifactDigest: prepared.artifactDigest,
        };
        const staged = await signedRequest<{ ok: boolean; code?: string }>(
          new URL('/prepare', w.url),
          w.key,
          { ...input, html: prepared.html },
          { tls: w.tls, allowLocalHttp: w.allowLocalHttp, timeoutMs: 35000 },
        );
        if (!staged.ok) throw new Fault(422, 'DEPLOYMENT_ARTIFACT_INVALID');
        await this.phase(org.id, d.id, token, 'health_check');
        const health = await signedRequest<{ ok: boolean; attestation?: DeploymentAttestation }>(
          new URL('/health', w.url),
          w.key,
          input,
          { tls: w.tls, allowLocalHttp: w.allowLocalHttp, timeoutMs: 10000 },
        );
        if (!health.ok || !health.attestation) throw new Fault(422, 'DEPLOYMENT_HEALTH_FAILED');
        await this.db.tenant(org.id, async (tx) => {
          await tx.one('SELECT id FROM organizations WHERE id=$1 FOR UPDATE', [org.id]);
          const current = await tx.one<DeploymentRow>(
            "SELECT * FROM deployments WHERE organization_id=$1 AND id=$2 AND lease_token=$3 AND lease_expires_at>now() AND status='deploying' FOR UPDATE",
            [org.id, d.id, token],
          );
          if (!current) return;
          const request = requireValue(
            await tx.one<ReleaseRow>(
              'SELECT * FROM release_requests WHERE organization_id=$1 AND id=$2',
              [org.id, r.id],
            ),
          );
          await this.releases.activate(tx, current, request, health.attestation!);
        });
      } catch (error) {
        const code = error instanceof Fault ? error.code : 'DEPLOYMENT_DEPENDENCY_UNAVAILABLE';
        await this.db.tenant(org.id, async (tx) => {
          await tx.one('SELECT id FROM organizations WHERE id=$1 FOR UPDATE', [org.id]);
          const current = await tx.one<DeploymentRow>(
            'SELECT * FROM deployments WHERE organization_id=$1 AND id=$2 AND lease_token=$3 FOR UPDATE',
            [org.id, d.id, token],
          );
          if (!current) return;
          await tx.exec(
            "UPDATE deployments SET status='failed',phase='failed',failure_code=$4,lease_token=NULL,lease_expires_at=NULL WHERE organization_id=$1 AND id=$2 AND lease_token=$3",
            [org.id, d.id, token, code],
          );
          await tx.exec(
            "UPDATE release_requests SET status='failed',revision=revision+1 WHERE organization_id=$1 AND id=$2",
            [org.id, r.id],
          );
          await this.releases.event(
            tx,
            r,
            { userId: d.initiated_by },
            'deployment_failed',
            d.trace_id,
            d.id,
            { code },
          );
        });
      }
    }
  }
}
