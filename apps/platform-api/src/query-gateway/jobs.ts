import type { GatewayPlan, GatewayResult, components } from '@eas/api-contract';
import { signedRequest } from '@eas/connector-transport';
import type { Database, Sql } from '../infrastructure/database.js';
import type { Identity, Subject } from '../identity/identity.js';
import type { WorkerTarget } from '../infrastructure/worker-target.js';
import { Fault, requireValue } from '../infrastructure/errors.js';
import { QueryGateway, type GatewayJobRow, jobDto } from './service.js';
type S = components['schemas'];
const safeFailures = new Set([
  'QUERY_TIMEOUT',
  'QUERY_CANCELLED',
  'QUERY_COST_REJECTED',
  'QUERY_RESULT_TOO_LARGE',
  'CONNECTION_LOST',
  'QUERY_EXECUTION_FAILED',
  'NETWORK_ADDRESS_FORBIDDEN',
  'CREDENTIAL_UNAVAILABLE',
  'DATABASE_ROLE_UNSAFE',
  'DATABASE_RLS_REQUIRED',
  'GATEWAY_ENGINE_UNVERIFIED',
  'POLICY_CHANGED',
  'LEASE_EXPIRED',
  'QUERY_CAPACITY_EXCEEDED',
  'ENVIRONMENT_FORBIDDEN',
]);
export class GatewayJobs {
  private timer: ReturnType<typeof setInterval> | undefined;
  private ticking = false;
  private stopping = false;
  private readonly active = new Map<string, Promise<void>>();
  constructor(
    private readonly db: Database,
    private readonly identity: Identity,
    private readonly gateway: QueryGateway,
    private readonly targets: Partial<Record<'test' | 'production', WorkerTarget>>,
    private readonly validate: (name: string, data: unknown) => boolean,
  ) {}
  private async subject(tx: Sql, j: GatewayJobRow) {
    return this.identity.subject(tx, j.context.actor, j.organization_id);
  }
  async lease(
    org: string,
    id: string,
    environment: 'test' | 'production',
  ): Promise<GatewayPlan | null> {
    return this.db.tenant(org, async (tx) => {
      await tx.one('SELECT id FROM organizations WHERE id=$1 FOR UPDATE', [org]);
      const j = requireValue(
        await tx.one<GatewayJobRow>(
          'SELECT * FROM query_jobs WHERE organization_id=$1 AND id=$2 FOR UPDATE',
          [org, id],
        ),
      );
      if (j.environment !== environment) throw new Fault(403, 'ENVIRONMENT_FORBIDDEN');
      if (
        (j.status !== 'queued' &&
          !(
            j.status === 'running' &&
            j.lease_expires_at &&
            j.lease_expires_at.getTime() < Date.now()
          )) ||
        j.attempt >= 3
      )
        throw new Fault(409, 'STATE_CONFLICT');
      const subject = await this.subject(tx, j),
        { auth } = await this.gateway.authorizedJob(tx, subject, id);
      const capacity = requireValue(
        await tx.one<{ organization: number; user_count: number }>(
          "SELECT count(*)::integer AS organization,count(*) FILTER(WHERE initiator_user_id=$3)::integer AS user_count FROM query_jobs WHERE organization_id=$1 AND id<>$2 AND status='running' AND lease_expires_at>now()",
          [org, id, j.initiator_user_id],
        ),
      );
      // Execution slots control scheduling, never admission. Leave a busy job queued.
      if (capacity.organization >= 4 || capacity.user_count >= 2) return null;
      const expiresAt = new Date(Date.now() + 30000).toISOString();
      await tx.exec(
        "UPDATE query_jobs SET status='running',attempt=attempt+1,lease_expires_at=$3 WHERE organization_id=$1 AND id=$2",
        [org, id, expiresAt],
      );
      return { ...auth.plan, jobId: id, organizationId: org, attempt: j.attempt + 1, expiresAt };
    });
  }
  private async finish(org: string, id: string, r: GatewayResult) {
    await this.db.tenant(org, async (tx) => {
      await tx.one('SELECT id FROM organizations WHERE id=$1 FOR UPDATE', [org]);
      const j = requireValue(
        await tx.one<GatewayJobRow>(
          'SELECT * FROM query_jobs WHERE organization_id=$1 AND id=$2 FOR UPDATE',
          [org, id],
        ),
      );
      if (j.status !== 'running' || j.attempt !== r.attempt || r.jobId !== id) return;
      let subject: Subject = { ...j.context.actor, organizationId: org, actions: new Set() },
        auth: Awaited<ReturnType<QueryGateway['authorize']>> | undefined;
      try {
        subject = await this.subject(tx, j);
        auth = (await this.gateway.authorizedJob(tx, subject, id)).auth;
        if (!j.lease_expires_at || j.lease_expires_at.getTime() < Date.now())
          throw new Fault(403, 'LEASE_EXPIRED');
      } catch {
        r = { ...r, ok: false, data: null, failureCode: 'POLICY_CHANGED' };
      }
      if (!Number.isInteger(r.durationMs) || r.durationMs < 0 || r.durationMs > 60000)
        r = { ...r, ok: false, data: null, failureCode: 'QUERY_EXECUTION_FAILED', durationMs: 0 };
      if (r.ok && auth) {
        const expected = [...auth.query.dimensions, ...auth.query.metrics];
        if (
          !r.data ||
          !this.validate('QueryResult', r.data) ||
          (auth.rowLimit > 0 && r.data.rows.length > auth.rowLimit) ||
          r.data.columns.map((c) => c.key).join(',') !== expected.join(',') ||
          r.data.rows.some((row) => row.length !== expected.length) ||
          r.data.columns.some(
            (c) => c.masked !== auth!.plan.masks.some((m) => m.fieldKey === c.key),
          )
        )
          r = { ...r, ok: false, data: null, failureCode: 'QUERY_EXECUTION_FAILED' };
      }
      if (r.ok && r.data && auth) {
        r.data.nextCursor =
          auth.query.pagination && r.data.truncated
            ? this.gateway.cursor(auth.scope, auth.offset + auth.rowLimit)
            : null;
      }
      if (!r.ok && r.failureCode === 'QUERY_CAPACITY_EXCEEDED' && auth) {
        await tx.exec(
          "UPDATE query_jobs SET status='queued',attempt=greatest(0,attempt-1),lease_expires_at=NULL,failure_code=NULL WHERE organization_id=$1 AND id=$2",
          [org, id],
        );
        return;
      }
      const code = r.ok
          ? null
          : safeFailures.has(r.failureCode ?? '')
            ? r.failureCode
            : 'QUERY_EXECUTION_FAILED',
        rowCount = r.ok ? (r.data?.rows.length ?? 0) : 0;
      await tx.exec(
        'UPDATE query_jobs SET status=$3,result=$4,failure_code=$5,duration_ms=$6,row_count=$7,completed_at=now(),lease_expires_at=NULL WHERE organization_id=$1 AND id=$2',
        [
          org,
          id,
          r.ok ? 'succeeded' : 'failed',
          r.ok ? JSON.stringify(r.data) : null,
          code,
          r.durationMs,
          rowCount,
        ],
      );
      await this.gateway.audit(tx, subject, {
        jobId: id,
        datasetId: j.dataset_id,
        appId: j.context.appId,
        reportId: j.context.reportId,
        environment: j.environment,
        durationMs: r.durationMs,
        rowCount,
        status: code ?? 'succeeded',
        allowed: code !== 'POLICY_CHANGED',
        traceId: j.trace_id,
        slow: r.durationMs >= (auth?.policy.definition.slowQueryMs ?? 1000),
      });
    });
  }
  private async dispatch(org: string, id: string, environment: 'test' | 'production') {
    const target = this.targets[environment];
    if (!target) {
      await this.failQueued(org, id, 'DEPENDENCY_UNAVAILABLE');
      return;
    }
    try {
      const r = await signedRequest<GatewayResult | { queued: true }>(
        new URL('/gateway/execute', target.url),
        target.key,
        { organizationId: org, jobId: id },
        { tls: target.tls, allowLocalHttp: target.allowLocalHttp, timeoutMs: 35000 },
      );
      if (
        r &&
        typeof r === 'object' &&
        'queued' in r &&
        r.queued === true &&
        Object.keys(r).length === 1
      )
        return;
      if (
        !r ||
        typeof r !== 'object' ||
        !('ok' in r) ||
        Object.keys(r).sort().join(',') !== 'attempt,data,durationMs,failureCode,jobId,ok' ||
        typeof r.ok !== 'boolean'
      )
        throw new Error();
      await this.finish(org, id, r);
    } catch {
      await this.failQueued(org, id, 'DEPENDENCY_UNAVAILABLE');
    }
  }
  private async failQueued(org: string, id: string, code: string) {
    await this.db.tenant(org, async (tx) => {
      await tx.one('SELECT id FROM organizations WHERE id=$1 FOR UPDATE', [org]);
      const j = await tx.one<GatewayJobRow>(
        "UPDATE query_jobs SET status='failed',failure_code=$3,completed_at=now() WHERE organization_id=$1 AND id=$2 AND status='queued' RETURNING *",
        [org, id, code],
      );
      if (j)
        await this.gateway.audit(
          tx,
          { ...j.context.actor, organizationId: org, actions: new Set() },
          {
            jobId: id,
            datasetId: j.dataset_id,
            appId: j.context.appId,
            reportId: j.context.reportId,
            environment: j.environment,
            durationMs: 0,
            rowCount: 0,
            status: code,
            allowed: code === 'DEPENDENCY_UNAVAILABLE',
            traceId: j.trace_id,
          },
        );
    });
  }
  async cancel(tx: Sql, subject: Subject, id: string): Promise<S['QueryJob']> {
    const j = requireValue(
      await tx.one<GatewayJobRow>(
        'SELECT * FROM query_jobs WHERE organization_id=$1 AND id=$2 FOR UPDATE',
        [subject.organizationId, id],
      ),
    );
    if (j.initiator_user_id !== subject.userId) throw new Fault(404, 'NOT_FOUND');
    if (['queued', 'running'].includes(j.status)) {
      await tx.exec(
        "UPDATE query_jobs SET status='cancelled',result=NULL,completed_at=now(),failure_code='QUERY_CANCELLED',lease_expires_at=NULL WHERE organization_id=$1 AND id=$2",
        [subject.organizationId, id],
      );
      j.status = 'cancelled';
      j.failure_code = 'QUERY_CANCELLED';
      j.result = null;
      await this.gateway.audit(tx, subject, {
        jobId: id,
        datasetId: j.dataset_id,
        appId: j.context.appId,
        reportId: j.context.reportId,
        environment: j.environment,
        durationMs: 0,
        rowCount: 0,
        status: 'cancelled',
        allowed: true,
        traceId: j.trace_id,
      });
    }
    return jobDto(j, false);
  }
  async signalCancel(org: string, id: string, environment: 'test' | 'production') {
    const target = this.targets[environment];
    if (!target) return;
    await signedRequest(
      new URL('/gateway/cancel', target.url),
      target.key,
      { organizationId: org, jobId: id },
      { tls: target.tls, allowLocalHttp: target.allowLocalHttp, timeoutMs: 2000 },
    ).catch(() => {});
  }
  async tick() {
    if (this.stopping || this.ticking) return;
    this.ticking = true;
    try {
      for (const org of await this.db.global.all<{ id: string }>('SELECT id FROM organizations')) {
        const cancel: string[] = [];
        const candidates = await this.db.tenant(org.id, async (tx) => {
          await tx.one('SELECT id FROM organizations WHERE id=$1 FOR UPDATE', [org.id]);
          await tx.exec(
            'UPDATE query_jobs SET result=NULL WHERE organization_id=$1 AND expires_at<=now() AND result IS NOT NULL',
            [org.id],
          );
          await tx.exec(
            "UPDATE query_jobs SET status='failed',failure_code='LEASE_EXPIRED',completed_at=now() WHERE organization_id=$1 AND expires_at<=now() AND status='queued'",
            [org.id],
          );
          const running = await tx.all<GatewayJobRow>(
            "SELECT * FROM query_jobs WHERE organization_id=$1 AND status='running'",
            [org.id],
          );
          for (const j of running) {
            let code: string | undefined;
            try {
              await this.gateway.authorizedJob(tx, await this.subject(tx, j), j.id);
            } catch {
              code = 'POLICY_CHANGED';
            }
            if (j.lease_expires_at && j.lease_expires_at.getTime() < Date.now() && j.attempt >= 3)
              code = 'LEASE_EXPIRED';
            if (code) {
              await tx.exec(
                "UPDATE query_jobs SET status='failed',result=NULL,failure_code=$3,completed_at=now(),lease_expires_at=NULL WHERE organization_id=$1 AND id=$2",
                [org.id, j.id, code],
              );
              cancel.push(j.id);
              await this.gateway.audit(
                tx,
                { ...j.context.actor, organizationId: org.id, actions: new Set() },
                {
                  jobId: j.id,
                  datasetId: j.dataset_id,
                  appId: j.context.appId,
                  reportId: j.context.reportId,
                  environment: j.environment,
                  durationMs: 0,
                  rowCount: 0,
                  status: code,
                  allowed: false,
                  traceId: j.trace_id,
                },
              );
            }
          }
          return tx.all<{ id: string; environment: 'test' | 'production' }>(
            `
     WITH executing AS (
      SELECT initiator_user_id,count(*) AS running FROM query_jobs
      WHERE organization_id=$1 AND status='running' AND lease_expires_at>now() GROUP BY initiator_user_id
     ), waiting AS (
      SELECT j.id,j.environment,j.created_at,coalesce(e.running,0) AS running,
       row_number() OVER(PARTITION BY j.initiator_user_id ORDER BY j.created_at,j.id) AS position
      FROM query_jobs j LEFT JOIN executing e USING(initiator_user_id)
      WHERE j.organization_id=$1 AND j.expires_at>now() AND NOT(j.id=ANY($2::uuid[]))
       AND (j.status='queued' OR j.status='running' AND j.lease_expires_at<now() AND j.attempt<3)
     ) SELECT id,environment FROM waiting WHERE position+running<=2 AND (SELECT coalesce(sum(running),0) FROM executing)<4
     ORDER BY created_at,id LIMIT 4`,
            [org.id, [...this.active.keys()]],
          );
        });
        for (const id of cancel) {
          const j = await this.db.tenant(org.id, (tx) =>
            tx.one<{ environment: 'test' | 'production' }>(
              'SELECT environment FROM query_jobs WHERE organization_id=$1 AND id=$2',
              [org.id, id],
            ),
          );
          if (j) void this.signalCancel(org.id, id, j.environment);
        }
        for (const j of candidates) {
          if (this.active.has(j.id) || this.active.size >= 4) continue;
          const task = this.dispatch(org.id, j.id, j.environment)
            .catch(() => {})
            .finally(() => this.active.delete(j.id));
          this.active.set(j.id, task);
        }
      }
    } finally {
      this.ticking = false;
    }
  }
  start() {
    this.timer = setInterval(() => {
      void this.tick().catch(() => {});
    }, 250);
    this.timer.unref();
  }
  async close() {
    this.stopping = true;
    if (this.timer) clearInterval(this.timer);
    await Promise.allSettled(this.active.values());
  }
}
