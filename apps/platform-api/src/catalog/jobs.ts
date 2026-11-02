import { randomUUID } from 'node:crypto';
import type { CatalogPlan, ConnectorResult, CatalogEnvironment } from '@eas/api-contract';
import { digest, signedRequest } from '@eas/connector-transport';
import type { Database, Sql } from '../infrastructure/database.js';
import type { Actor, Identity } from '../identity/identity.js';
import { Fault, requireValue } from '../infrastructure/errors.js';
import { CatalogService } from './service.js';
import { type JobRow, type EndpointRow, endpointDto } from './models.js';
import type { WorkerTarget } from '../infrastructure/worker-target.js';
export type { WorkerTarget } from '../infrastructure/worker-target.js';
export class CatalogJobs {
  private timer: ReturnType<typeof setInterval> | undefined;
  private readonly inFlight = new Map<string, Promise<void>>();
  private stopping = false;
  constructor(
    private readonly db: Database,
    private readonly identity: Identity,
    private readonly service: CatalogService,
    private readonly targets: Partial<Record<CatalogEnvironment, WorkerTarget>>,
    private readonly validateResult: (
      result: ConnectorResult,
      plan: Pick<CatalogPlan, 'jobId' | 'attempt' | 'operation' | 'relations'>,
    ) => boolean,
  ) {}
  async lease(
    organizationId: string,
    id: string,
    environment: CatalogEnvironment,
  ): Promise<CatalogPlan> {
    return this.db.tenant(organizationId, async (tx) => {
      await tx.one('SELECT id FROM organizations WHERE id=$1 FOR UPDATE', [organizationId]);
      const job = requireValue(
        await tx.one<JobRow>(
          'SELECT * FROM catalog_jobs WHERE organization_id=$1 AND id=$2 FOR UPDATE',
          [organizationId, id],
        ),
      );
      if (job.operation === 'preview') throw new Fault(410, 'QUERY_GATEWAY_REQUIRED');
      if (job.environment !== environment) throw new Fault(403, 'ENVIRONMENT_FORBIDDEN');
      if (
        (job.status !== 'queued' &&
          !(
            job.status === 'running' &&
            job.lease_expires_at &&
            job.lease_expires_at.getTime() < Date.now()
          )) ||
        job.attempt >= 3
      )
        throw new Fault(409, 'STATE_CONFLICT');
      const epoch = requireValue(
        await tx.one<{ policy_epoch: number }>(
          'SELECT policy_epoch FROM organizations WHERE id=$1',
          [organizationId],
        ),
      );
      if (Number(epoch.policy_epoch) !== Number(job.policy_epoch))
        throw new Fault(403, 'POLICY_CHANGED');
      const user = requireValue(
        await tx.one<{ display_name: string }>(
          "SELECT display_name FROM users WHERE id=$1 AND status='active'",
          [job.requested_by],
        ),
      );
      const actor: Actor = {
        userId: job.requested_by,
        displayName: user.display_name,
        clientKind: job.input.clientKind,
        authenticatedAt: job.input.authenticatedAt,
      };
      const subject = await this.identity.subject(tx, actor, organizationId);
      const c = await this.service.connectionRow(tx, organizationId, job.physical_connection_id);
      if (c.status !== 'active' || Number(c.revision) !== job.input.connectionRevision)
        throw new Fault(403, 'POLICY_CHANGED');
      const preview: null = null;
      this.identity.requireConnection(subject, c.environment, job.operation);
      const endpoint = requireValue(
        await tx.one<EndpointRow>(
          'SELECT * FROM network_endpoints WHERE organization_id=$1 AND id=$2',
          [organizationId, c.endpoint_id],
        ),
      );
      const relations = job.input.relations ?? [];
      if (
        relations.some(
          (r) => !c.metadata_scope.some((a) => a.schema === r.schema && a.name === r.name),
        )
      )
        throw new Fault(403, 'RELATION_FORBIDDEN');
      const attempt = job.attempt + 1,
        expiresAt = new Date(Date.now() + 30_000).toISOString();
      await tx.exec(
        "UPDATE catalog_jobs SET status='running',attempt=$3,lease_expires_at=$4 WHERE organization_id=$1 AND id=$2",
        [organizationId, id, attempt, expiresAt],
      );
      return {
        jobId: id,
        organizationId,
        attempt,
        expiresAt,
        environment,
        operation: job.operation,
        policyEpoch: Number(job.policy_epoch),
        connection: {
          id: c.id,
          engine: c.engine,
          databaseName: c.database_name,
          secretRef: c.secret_ref,
          credentialRevision: Number(c.credential_revision),
          connectTimeoutMs: c.connect_timeout_ms,
          requestTimeoutMs: c.request_timeout_ms,
          poolMax: c.pool_max,
          endpoint: { ...endpointDto(endpoint), caRef: endpoint.ca_ref },
        },
        relations,
        preview,
      };
    });
  }
  private async finish(organizationId: string, id: string, result: ConnectorResult): Promise<void> {
    await this.db.tenant(organizationId, async (tx) => {
      await tx.one('SELECT id FROM organizations WHERE id=$1 FOR UPDATE', [organizationId]);
      const job = requireValue(
        await tx.one<JobRow>(
          'SELECT * FROM catalog_jobs WHERE organization_id=$1 AND id=$2 FOR UPDATE',
          [organizationId, id],
        ),
      );
      if (job.status !== 'running' || job.attempt !== result.attempt || result.jobId !== id) return;
      const epoch = requireValue(
        await tx.one<{ policy_epoch: number }>(
          'SELECT policy_epoch FROM organizations WHERE id=$1',
          [organizationId],
        ),
      );
      if (Number(epoch.policy_epoch) !== Number(job.policy_epoch)) {
        result = { ...result, ok: false, data: null, failureCode: 'POLICY_CHANGED' };
      }
      if (!job.lease_expires_at || job.lease_expires_at.getTime() < Date.now()) {
        result = { ...result, ok: false, data: null, failureCode: 'LEASE_EXPIRED' };
      }
      let payload: unknown = result.data;
      if (result.ok && job.operation === 'metadata') {
        if (!result.data || !('relations' in result.data))
          throw new Fault(422, 'METADATA_SYNC_FAILED');
        const snapshotId = randomUUID();
        await tx.exec(
          'INSERT INTO metadata_snapshots(id,organization_id,physical_connection_id,job_id,schema_digest,relations) VALUES($1,$2,$3,$4,$5,$6)',
          [
            snapshotId,
            organizationId,
            job.physical_connection_id,
            id,
            digest(result.data.relations),
            JSON.stringify(result.data.relations),
          ],
        );
        payload = { metadataSnapshotId: snapshotId };
      }
      if (job.operation === 'health')
        await tx.exec(
          'UPDATE physical_connections SET last_health_status=$3,last_checked_at=now() WHERE organization_id=$1 AND id=$2',
          [organizationId, job.physical_connection_id, result.ok ? 'healthy' : 'unhealthy'],
        );
      await tx.exec(
        'UPDATE catalog_jobs SET status=$3,result=$4,failure_code=$5,completed_at=now(),lease_expires_at=NULL WHERE organization_id=$1 AND id=$2',
        [
          organizationId,
          id,
          result.ok ? 'succeeded' : 'failed',
          result.ok ? JSON.stringify(payload) : null,
          result.ok ? null : safeFailure(result.failureCode),
        ],
      );
      await tx.exec(
        `INSERT INTO audit_logs(organization_id,actor_service,action,resource_id,outcome,request_id) VALUES($1,'catalog-connector',$2,$3,$4,$5)`,
        [organizationId, 'catalog.' + job.operation, id, result.ok ? 'allow' : 'error', id],
      );
    });
  }
  private async dispatch(
    organizationId: string,
    id: string,
    environment: CatalogEnvironment,
  ): Promise<void> {
    const target = this.targets[environment];
    if (!target) {
      await this.failQueued(organizationId, id, 'DEPENDENCY_UNAVAILABLE');
      return;
    }
    try {
      const response = await signedRequest<ConnectorResult>(
        new URL('/execute', target.url),
        target.key,
        { organizationId, jobId: id },
        { tls: target.tls, allowLocalHttp: target.allowLocalHttp, timeoutMs: 35_000 },
      );
      // Reconstruct the expected public result schema without issuing a second lease.
      const job = await this.db.tenant(organizationId, (tx) =>
        tx.one<JobRow>('SELECT * FROM catalog_jobs WHERE organization_id=$1 AND id=$2', [
          organizationId,
          id,
        ]),
      );
      if (!job) return;
      if (
        !this.validateResult(response, {
          jobId: id,
          attempt: job.attempt,
          operation: job.operation,
          relations: job.input.relations ?? [],
        })
      )
        throw new Error('INVALID_CONNECTOR_RESULT');
      await this.finish(organizationId, id, response);
    } catch {
      await this.failQueued(organizationId, id, 'DEPENDENCY_UNAVAILABLE');
    }
  }
  private async failQueued(org: string, id: string, code: string): Promise<void> {
    await this.db.tenant(org, async (tx) => {
      await tx.exec(
        `UPDATE catalog_jobs SET status='failed',failure_code=$3,result=NULL,completed_at=now(),lease_expires_at=NULL WHERE organization_id=$1 AND id=$2 AND status='queued'`,
        [org, id, code],
      );
    });
  }
  async tick(): Promise<void> {
    if (this.stopping) return;
    const organizations = await this.db.global.all<{ id: string }>('SELECT id FROM organizations');
    for (const org of organizations) {
      const jobs = await this.db.tenant(org.id, async (tx) => {
        await tx.exec(
          "UPDATE catalog_jobs SET result=NULL WHERE organization_id=$1 AND operation='preview' AND completed_at<now()-interval '5 minutes' AND result IS NOT NULL",
          [org.id],
        );
        await tx.exec(
          "UPDATE catalog_jobs SET status='failed',failure_code='LEASE_EXPIRED',lease_expires_at=NULL,completed_at=now() WHERE organization_id=$1 AND status='running' AND lease_expires_at<now() AND attempt>=3",
          [org.id],
        );
        return tx.all<{ id: string; environment: CatalogEnvironment }>(
          "SELECT id,environment FROM catalog_jobs WHERE organization_id=$1 AND (status='queued' OR (status='running' AND lease_expires_at<now() AND attempt<3)) ORDER BY created_at LIMIT 8",
          [org.id],
        );
      });
      for (const job of jobs) {
        if (this.inFlight.has(job.id) || this.inFlight.size >= 4) continue;
        const task = this.dispatch(org.id, job.id, job.environment)
          .catch(() => {})
          .finally(() => this.inFlight.delete(job.id));
        this.inFlight.set(job.id, task);
      }
    }
  }
  start(): void {
    this.timer = setInterval(() => {
      void this.tick().catch(() => {});
    }, 250);
    this.timer.unref();
    void this.tick().catch(() => {});
  }
  async close(): Promise<void> {
    this.stopping = true;
    if (this.timer) clearInterval(this.timer);
    await Promise.allSettled(this.inFlight.values());
  }
}
const failures = new Set([
  'CONNECTION_FAILED',
  'CONNECTION_TIMEOUT',
  'CREDENTIAL_UNAVAILABLE',
  'METADATA_SYNC_FAILED',
  'RELATION_FORBIDDEN',
  'NETWORK_ADDRESS_FORBIDDEN',
  'QUERY_LIMIT_EXCEEDED',
  'POLICY_CHANGED',
  'LEASE_EXPIRED',
  'ENVIRONMENT_FORBIDDEN',
  'DEPENDENCY_UNAVAILABLE',
]);
function safeFailure(code: string | null): string {
  return code && failures.has(code) ? code : 'DEPENDENCY_UNAVAILABLE';
}
