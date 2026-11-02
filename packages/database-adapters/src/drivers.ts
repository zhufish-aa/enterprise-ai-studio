import pg from 'pg';
import mysql, { type Pool as MysqlPool, type RowDataPacket } from 'mysql2/promise';
import sql from 'mssql';
import net from 'node:net';
import type { CatalogPlan } from '@eas/api-contract';
import { AdapterError, type Credential } from './network.js';
export type DataRow = Record<string, unknown>;
export interface DriverSession {
  query(text: string, values?: unknown[]): Promise<DataRow[]>;
}
export interface DriverPool {
  query(text: string, values: unknown[], signal: AbortSignal): Promise<DataRow[]>;
  session?<T>(fn: (session: DriverSession) => Promise<T>, signal: AbortSignal): Promise<T>;
  close(): Promise<void>;
}
export function createDriverPool(
  plan: Pick<CatalogPlan, 'connection'>,
  address: string,
  credential: Credential,
  ca: string | undefined,
): DriverPool {
  const c = plan.connection,
    endpoint = c.endpoint;
  if (c.engine === 'postgresql') {
    const config = {
      host: address,
      port: endpoint.port,
      database: c.databaseName,
      user: credential.username,
      password: credential.password,
      max: c.poolMax,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: c.connectTimeoutMs,
      query_timeout: 0,
      options: `-c default_transaction_read_only=on -c statement_timeout=${c.requestTimeoutMs}`,
      ssl:
        endpoint.tlsMode === 'verify-full'
          ? { rejectUnauthorized: true, servername: endpoint.tlsServerName, ...(ca ? { ca } : {}) }
          : false,
    };
    // DATE is a calendar value, not local-midnight Date; preserve it across worker time zones.
    const types = {
      getTypeParser: (oid: number, format: 'text' | 'binary' = 'text') =>
        oid === 1082 && format === 'text'
          ? (value: string) => value
          : pg.types.getTypeParser(oid, format),
    };
    const pool = new pg.Pool({ ...config, types }),
      cancelPool = new pg.Pool({
        ...config,
        types,
        max: 1,
        connectionTimeoutMillis: 1000,
        query_timeout: 1000,
      });
    pool.on('error', () => {});
    pool.on('connect', (client) => client.on('error', () => {}));
    cancelPool.on('error', () => {});
    cancelPool.on('connect', (client) => client.on('error', () => {}));
    return {
      async query(text, values, signal) {
        const deadline = AbortSignal.any([signal, AbortSignal.timeout(c.requestTimeoutMs)]);
        deadline.throwIfAborted();
        const client = await pool.connect();
        let released = false;
        const abort = () => {
          if (!released) {
            released = true;
            client.release(true);
          }
        };
        deadline.addEventListener('abort', abort, { once: true });
        try {
          deadline.throwIfAborted();
          const result = await client.query(text, values);
          return result.rows as DataRow[];
        } finally {
          deadline.removeEventListener('abort', abort);
          if (!released) client.release();
        }
      },
      async session<T>(
        fn: (session: DriverSession) => Promise<T>,
        signal: AbortSignal,
      ): Promise<T> {
        signal.throwIfAborted();
        const client = await pool.connect();
        let pid: number | undefined,
          cancellation: Promise<unknown> | undefined,
          released = false,
          broken = false;
        const abort = () => {
          if (pid)
            cancellation = cancelPool.query('SELECT pg_cancel_backend($1)', [pid]).catch(() => {
              if (!released) {
                released = true;
                client.release(true);
              }
            });
        };
        signal.addEventListener('abort', abort, { once: true });
        try {
          signal.throwIfAborted();
          await client.query('BEGIN READ ONLY');
          pid = Number((await client.query('SELECT pg_backend_pid() AS pid')).rows[0]?.pid);
          signal.throwIfAborted();
          const result = await fn({
            async query(text, values = []) {
              signal.throwIfAborted();
              const rows = await new Promise<DataRow[]>((resolve, reject) => {
                let bytes = 0,
                  overflow = false;
                const collected: DataRow[] = [],
                  request = new pg.Query<DataRow>({ text, values });
                request.on('row', (row) => {
                  if (overflow) return;
                  bytes += Buffer.byteLength(JSON.stringify(row));
                  if (bytes > 2_097_152) {
                    overflow = true;
                    abort();
                    return;
                  }
                  collected.push(row);
                });
                request.on('error', (error) =>
                  reject(overflow ? new AdapterError('QUERY_RESULT_TOO_LARGE') : error),
                );
                request.on('end', () =>
                  overflow
                    ? reject(new AdapterError('QUERY_RESULT_TOO_LARGE'))
                    : resolve(collected),
                );
                client.query(request);
              });
              signal.throwIfAborted();
              return rows;
            },
          });
          signal.throwIfAborted();
          await client.query('COMMIT');
          return result;
        } catch (error) {
          broken = true;
          await cancellation;
          throw error;
        } finally {
          signal.removeEventListener('abort', abort);
          await cancellation;
          if (!released) client.release(broken || signal.aborted);
        }
      },
      async close() {
        await Promise.all([pool.end(), cancelPool.end()]);
      },
    };
  }
  if (c.engine === 'mysql') {
    const pool: MysqlPool = mysql.createPool({
      host: endpoint.tlsServerName,
      port: endpoint.port,
      stream: () => net.connect({ host: address, port: endpoint.port }),
      database: c.databaseName,
      user: credential.username,
      password: credential.password,
      connectionLimit: c.poolMax,
      maxIdle: c.poolMax,
      idleTimeout: 10000,
      queueLimit: 8,
      connectTimeout: c.connectTimeoutMs,
      multipleStatements: false,
      decimalNumbers: false,
      ...(endpoint.tlsMode === 'verify-full'
        ? { ssl: { rejectUnauthorized: true, verifyIdentity: true, ...(ca ? { ca } : {}) } }
        : {}),
    });
    return {
      async query(text, values, signal) {
        signal.throwIfAborted();
        const client = await pool.getConnection();
        const abort = () => client.destroy();
        signal.addEventListener('abort', abort, { once: true });
        try {
          await client.query('SET SESSION TRANSACTION READ ONLY');
          await client.query('SET SESSION MAX_EXECUTION_TIME = ' + c.requestTimeoutMs);
          const [rows] = await client.query<RowDataPacket[]>({
            sql: text,
            values,
            timeout: c.requestTimeoutMs,
          });
          return rows as DataRow[];
        } catch (error) {
          client.destroy();
          throw error;
        } finally {
          signal.removeEventListener('abort', abort);
          client.release();
        }
      },
      async close() {
        await pool.end();
      },
    };
  }
  if (c.engine === 'sqlserver') {
    const pool = new sql.ConnectionPool({
      server: address,
      port: endpoint.port,
      database: c.databaseName,
      user: credential.username,
      password: credential.password,
      connectionTimeout: c.connectTimeoutMs,
      requestTimeout: c.requestTimeoutMs,
      pool: { max: c.poolMax, min: 0, idleTimeoutMillis: 10000 },
      options: {
        encrypt: endpoint.tlsMode === 'verify-full',
        trustServerCertificate: false,
        serverName: endpoint.tlsServerName,
        ...(ca ? { cryptoCredentialsDetails: { ca } } : {}),
      },
    });
    pool.on('error', () => {});
    const ready = pool.connect();
    return {
      async query(text, values, signal) {
        signal.throwIfAborted();
        await ready;
        const request = pool.request();
        values.forEach((value, i) => request.input('p' + i, value));
        const abort = () => request.cancel();
        signal.addEventListener('abort', abort, { once: true });
        try {
          return (await request.query<DataRow>(text)).recordset;
        } finally {
          signal.removeEventListener('abort', abort);
        }
      },
      async close() {
        await ready.catch(() => {});
        await pool.close();
      },
    };
  }
  throw new AdapterError('ADAPTER_UNVERIFIED');
}
