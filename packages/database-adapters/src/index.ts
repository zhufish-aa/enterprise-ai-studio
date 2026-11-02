import { createHash } from 'node:crypto';
import type { CatalogPlan, ConnectorResult } from '@eas/api-contract';
import { createDriverPool, type DriverPool } from './drivers.js';
import { readRelation } from './metadata.js';
import { compilePreview } from './preview.js';
import { resolveApprovedAddress, AdapterError, type SecretProvider } from './network.js';
export {
  AdapterError,
  resolveApprovedAddress,
  FileSecretProvider,
  VaultSecretProvider,
} from './network.js';
export type { Credential, SecretProvider } from './network.js';
export { compilePreview } from './preview.js';
export { compileGateway } from './gateway-compiler.js';
export { GatewayExecutor } from './gateway-executor.js';
export interface AdapterFactory {
  create: typeof createDriverPool;
}
export class AdapterRegistry {
  private readonly pools = new Map<
    string,
    { pool: DriverPool; used: number; busy: number; connectionId: string }
  >();
  constructor(
    private readonly secrets: SecretProvider,
    private readonly allowFixture = false,
    private readonly factory: AdapterFactory = { create: createDriverPool },
  ) {}
  async execute(plan: CatalogPlan): Promise<ConnectorResult> {
    const failure = (code: string): ConnectorResult => ({
      jobId: plan.jobId,
      attempt: plan.attempt,
      ok: false,
      data: null,
      failureCode: code,
    });
    if (Date.parse(plan.expiresAt) <= Date.now()) return failure('LEASE_EXPIRED');
    if (plan.operation === 'preview' && plan.environment !== 'test')
      return failure('ENVIRONMENT_FORBIDDEN');
    let entry: { pool: DriverPool; used: number; busy: number; connectionId: string } | undefined;
    try {
      if (
        plan.connection.endpoint.environment !== plan.environment ||
        plan.connection.endpoint.engine !== plan.connection.engine ||
        !plan.connection.endpoint.allowedDatabases.includes(plan.connection.databaseName)
      )
        throw new AdapterError('NETWORK_ADDRESS_FORBIDDEN');
      if (
        plan.connection.engine === 'mysql' &&
        plan.relations.some((r) => r.schema !== plan.connection.databaseName)
      )
        throw new AdapterError('RELATION_FORBIDDEN');
      const address = await resolveApprovedAddress(plan.connection.endpoint, this.allowFixture);
      for (const relation of plan.relations)
        if (
          !plan.connection.endpoint.allowedRelations.some(
            (r) => r.schema === relation.schema && r.name === relation.name,
          )
        )
          throw new AdapterError('RELATION_FORBIDDEN');
      if (plan.operation === 'metadata' && (!plan.relations.length || plan.relations.length > 20))
        throw new AdapterError('RELATION_FORBIDDEN');
      if (
        plan.preview &&
        !plan.relations.some(
          (r) =>
            r.schema === plan.preview?.relation.schema && r.name === plan.preview?.relation.name,
        )
      )
        throw new AdapterError('RELATION_FORBIDDEN');
      const credential = await this.secrets.credential(plan.connection.secretRef, plan.environment);
      const ca = plan.connection.endpoint.caRef
        ? await this.secrets.certificate(plan.connection.endpoint.caRef)
        : undefined;
      const fingerprint = createHash('sha256')
        .update(
          JSON.stringify([
            plan.connection,
            address,
            credential.username,
            credential.password,
            credential.revision,
          ]),
        )
        .digest('hex');
      for (const [key, value] of this.pools)
        if (
          value.busy === 0 &&
          (value.used < Date.now() - 60_000 ||
            (key !== fingerprint &&
              (value.connectionId === plan.connection.id || this.pools.size >= 16)))
        ) {
          this.pools.delete(key);
          await value.pool.close();
        }
      entry = this.pools.get(fingerprint);
      if (Date.parse(plan.expiresAt) <= Date.now()) throw new AdapterError('LEASE_EXPIRED');
      if (!entry) {
        if (this.pools.size >= 16) throw new AdapterError('CONNECTION_TIMEOUT');
        entry = {
          pool: this.factory.create(plan, address, credential, ca),
          used: Date.now(),
          busy: 0,
          connectionId: plan.connection.id,
        };
        this.pools.set(fingerprint, entry);
      }
      entry.busy++;
      entry.used = Date.now();
      const duration = Math.max(1, Math.min(30_000, Date.parse(plan.expiresAt) - Date.now()));
      const signal = AbortSignal.timeout(duration);
      let data: ConnectorResult['data'];
      if (plan.operation === 'health') {
        await entry.pool.query('SELECT 1 AS healthy', [], signal);
        data = { healthy: true, checkedAt: new Date().toISOString() };
      } else if (plan.operation === 'metadata') {
        const relations = [];
        for (const r of plan.relations)
          relations.push(
            await readRelation(entry.pool, plan.connection.engine, r, plan.relations, signal),
          );
        data = { relations };
      } else {
        const query = compilePreview(plan);
        const rows = await entry.pool.query(query.text, query.values, signal);
        data = {
          columns: query.keys.map((key, i) => ({ key, dataType: query.types[i] ?? 'string' })),
          rows: rows.slice(0, query.limit).map((row) =>
            query.keys.map((k) => {
              const value = row[k];
              return value == null
                ? null
                : typeof value === 'number' || typeof value === 'boolean'
                  ? value
                  : value instanceof Date
                    ? value.toISOString()
                    : String(value).slice(0, 32768);
            }),
          ),
          truncated: rows.length > query.limit,
        };
      }
      if (Buffer.byteLength(JSON.stringify(data)) > 1_048_576)
        throw new AdapterError('QUERY_LIMIT_EXCEEDED');
      return { jobId: plan.jobId, attempt: plan.attempt, ok: true, data, failureCode: null };
    } catch (error) {
      if (error instanceof AdapterError) return failure(error.code);
      const code = (error as { code?: unknown })?.code;
      const timeout =
        (typeof code === 'string' &&
          ['ETIMEDOUT', 'ETIMEOUT', '57014', 'PROTOCOL_SEQUENCE_TIMEOUT'].includes(code)) ||
        (error instanceof Error && /timeout|timed out|aborted/i.test(error.message));
      return failure(
        timeout
          ? 'CONNECTION_TIMEOUT'
          : plan.operation === 'metadata'
            ? 'METADATA_SYNC_FAILED'
            : 'CONNECTION_FAILED',
      );
    } finally {
      if (entry) {
        entry.busy--;
        entry.used = Date.now();
      }
    }
  }
  async close(): Promise<void> {
    await Promise.allSettled([...this.pools.values()].map((e) => e.pool.close()));
    this.pools.clear();
  }
}
