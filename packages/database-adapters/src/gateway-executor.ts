import { createHash } from 'node:crypto';
import type { GatewayPlan, GatewayResult } from '@eas/api-contract';
import { createDriverPool, type DriverPool } from './drivers.js';
import { compileGateway } from './gateway-compiler.js';
import { AdapterError, resolveApprovedAddress, type SecretProvider } from './network.js';
type Entry = { pool: DriverPool; connectionId: string; used: number; busy: number };
export class GatewayExecutor {
  private readonly pools = new Map<string, Entry>();
  constructor(
    private readonly secrets: SecretProvider,
    private readonly allowFixture = false,
  ) {}
  async execute(plan: GatewayPlan, external: AbortSignal): Promise<GatewayResult> {
    const started = Date.now();
    let entry: Entry | undefined,
      reserved = false;
    const failure = (code: string): GatewayResult => ({
      jobId: plan.jobId,
      attempt: plan.attempt,
      ok: false,
      data: null,
      failureCode: code,
      durationMs: Date.now() - started,
    });
    try {
      if (plan.expiresAt <= new Date().toISOString()) throw new AdapterError('LEASE_EXPIRED');
      if (plan.connection.engine !== 'postgresql')
        throw new AdapterError('GATEWAY_ENGINE_UNVERIFIED');
      if (
        plan.connection.endpoint.environment !== plan.environment ||
        plan.connection.endpoint.engine !== plan.connection.engine ||
        !plan.connection.endpoint.allowedDatabases.includes(plan.connection.databaseName) ||
        !plan.connection.endpoint.allowedRelations.some(
          (r) => r.schema === plan.model.relation.schema && r.name === plan.model.relation.name,
        )
      )
        throw new AdapterError('ENVIRONMENT_FORBIDDEN');
      const address = await resolveApprovedAddress(plan.connection.endpoint, this.allowFixture),
        credential = await this.secrets.credential(plan.connection.secretRef, plan.environment),
        ca = plan.connection.endpoint.caRef
          ? await this.secrets.certificate(plan.connection.endpoint.caRef)
          : undefined;
      const fingerprint = createHash('sha256')
        .update(JSON.stringify([plan.connection, address, credential]))
        .digest('hex');
      for (const [key, e] of this.pools)
        if (
          !e.busy &&
          (e.used < Date.now() - 60000 ||
            (key !== fingerprint &&
              (e.connectionId === plan.connection.id || this.pools.size >= 16)))
        ) {
          this.pools.delete(key);
          await e.pool.close();
        }
      entry = this.pools.get(fingerprint);
      if (!entry) {
        if (this.pools.size >= 16) throw new AdapterError('QUERY_CAPACITY_EXCEEDED');
        entry = {
          pool: createDriverPool(plan, address, credential, ca),
          connectionId: plan.connection.id,
          used: Date.now(),
          busy: 0,
        };
        this.pools.set(fingerprint, entry);
      }
      if (entry.busy >= plan.connection.poolMax) throw new AdapterError('QUERY_CAPACITY_EXCEEDED');
      entry.busy++;
      reserved = true;
      const remaining = Date.parse(plan.expiresAt) - Date.now();
      if (remaining <= 0) throw new AdapterError('LEASE_EXPIRED');
      const signal = AbortSignal.any([
          external,
          AbortSignal.timeout(Math.max(1, Math.min(plan.timeoutMs, remaining))),
        ]),
        query = compileGateway(plan);
      if (!entry.pool.session) throw new AdapterError('GATEWAY_ENGINE_UNVERIFIED');
      const data = await entry.pool.session(async (db) => {
        await db.query(
          "SELECT set_config('statement_timeout',$1,true),set_config('lock_timeout',$1,true),set_config('eas.organization_id',$2,true),set_config('eas.user_id',$3,true),set_config('eas.department_codes',$4,true)",
          [
            String(plan.timeoutMs),
            plan.databaseContext.organizationId,
            plan.databaseContext.userId,
            JSON.stringify(plan.databaseContext.departments),
          ],
        );
        const role = (
          await db.query(
            'SELECT r.rolsuper,r.rolbypassrls,c.relrowsecurity,c.relforcerowsecurity,c.relowner=r.oid AS owns FROM pg_roles r CROSS JOIN pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE r.rolname=current_user AND n.nspname=$1 AND c.relname=$2',
            [plan.model.relation.schema, plan.model.relation.name],
          )
        )[0];
        if (!role || role['rolsuper'] || role['rolbypassrls'] || role['owns'])
          throw new AdapterError('DATABASE_ROLE_UNSAFE');
        if (plan.requireDatabaseRls && (!role['relrowsecurity'] || !role['relforcerowsecurity']))
          throw new AdapterError('DATABASE_RLS_REQUIRED');
        const explain = (await db.query('EXPLAIN (FORMAT JSON) ' + query.text, query.values))[0]?.[
          'QUERY PLAN'
        ];
        let nodes = 0;
        const inspect = (v: unknown): void => {
          if (!v || typeof v !== 'object') return;
          if (++nodes > 5000) throw new AdapterError('QUERY_COST_REJECTED');
          if (Array.isArray(v)) {
            v.forEach(inspect);
            return;
          }
          const o = v as Record<string, unknown>;
          for (const [key, value] of Object.entries(o)) {
            if (
              (key === 'Total Cost' &&
                (!Number.isFinite(Number(value)) || Number(value) > plan.maxCost)) ||
              (key === 'Plan Rows' &&
                (!Number.isFinite(Number(value)) || Number(value) > plan.maxScanRows))
            )
              throw new AdapterError('QUERY_COST_REJECTED');
            if (typeof value === 'object') inspect(value);
          }
        };
        if (!Array.isArray(explain)) throw new AdapterError('QUERY_COST_REJECTED');
        inspect(explain);
        const rows = await db.query(query.text, query.values);
        if (rows.some((row) => query.overflowKeys.some((k) => row[k] === 1)))
          throw new AdapterError('QUERY_RESULT_TOO_LARGE');
        const result = {
          columns: query.columns,
          rows: (plan.rowLimit > 0 ? rows.slice(0, plan.rowLimit) : rows).map((row) =>
            query.columns.map((c) => {
              const v = row[c.key];
              return v == null
                ? null
                : typeof v === 'number' || typeof v === 'boolean'
                  ? v
                  : v instanceof Date
                    ? v.toISOString()
                    : String(v).slice(0, 32768);
            }),
          ),
          truncated: plan.rowLimit > 0 && rows.length > plan.rowLimit,
          nextCursor: null,
        };
        if (Buffer.byteLength(JSON.stringify(result)) > 1_048_576)
          throw new AdapterError('QUERY_RESULT_TOO_LARGE');
        return result;
      }, signal);
      return {
        jobId: plan.jobId,
        attempt: plan.attempt,
        ok: true,
        data,
        failureCode: null,
        durationMs: Date.now() - started,
      };
    } catch (error) {
      if (external.aborted) return failure('QUERY_CANCELLED');
      if (error instanceof AdapterError) return failure(error.code);
      const code = String((error as { code?: unknown })?.code ?? '');
      return failure(
        code === '57014' ||
          (error instanceof Error && /timeout|timed out|aborted/i.test(error.message))
          ? 'QUERY_TIMEOUT'
          : /^08/.test(code) || ['57P01', 'ECONNRESET', 'ECONNREFUSED', 'EPIPE'].includes(code)
            ? 'CONNECTION_LOST'
            : 'QUERY_EXECUTION_FAILED',
      );
    } finally {
      if (entry && reserved) {
        entry.busy--;
        entry.used = Date.now();
      }
    }
  }
  async close() {
    await Promise.allSettled([...this.pools.values()].map((e) => e.pool.close()));
    this.pools.clear();
  }
}
