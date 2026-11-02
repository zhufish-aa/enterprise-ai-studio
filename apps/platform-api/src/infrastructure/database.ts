import pg from 'pg';
export interface Sql {
  all<T>(text: string, values?: unknown[]): Promise<T[]>;
  one<T>(text: string, values?: unknown[]): Promise<T | undefined>;
  exec(text: string, values?: unknown[]): Promise<number>;
}
export const sqlFor = (client: pg.Pool | pg.PoolClient): Sql => ({
  async all<T>(text: string, values: unknown[] = []) {
    return (await client.query(text, values)).rows as T[];
  },
  async one<T>(text: string, values: unknown[] = []) {
    return (await client.query(text, values)).rows[0] as T | undefined;
  },
  async exec(text: string, values: unknown[] = []) {
    return (await client.query(text, values)).rowCount ?? 0;
  },
});
export class Database {
  readonly pool: pg.Pool;
  readonly global: Sql;
  constructor(url: string) {
    this.pool = new pg.Pool({
      connectionString: url,
      max: 12,
      connectionTimeoutMillis: 5000,
      query_timeout: 10000,
      idleTimeoutMillis: 10000,
    });
    this.pool.on('error', () => {});
    this.global = sqlFor(this.pool);
  }
  async tenant<T>(organizationId: string, fn: (tx: Sql) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('eas.organization_id',$1,true)", [organizationId]);
      const result = await fn(sqlFor(client));
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }
  async close(): Promise<void> {
    await this.pool.end();
  }
}
