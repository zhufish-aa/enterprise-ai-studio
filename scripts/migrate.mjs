import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
export async function migrate(pool) {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock(218002)');
    await client.query(
      'CREATE TABLE IF NOT EXISTS schema_migrations(version text PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())',
    );
    for (const name of (await readdir(new URL('../infra/migrations/', import.meta.url)))
      .filter((f) => f.endsWith('.sql'))
      .sort()) {
      const source = await readFile(
          new URL('../infra/migrations/' + name, import.meta.url),
          'utf8',
        ),
        checksum = createHash('sha256').update(source).digest('hex');
      const found = (
        await client.query('SELECT checksum FROM schema_migrations WHERE version=$1', [name])
      ).rows[0];
      if (found) {
        if (found.checksum !== checksum) throw new Error('MIGRATION_CHECKSUM_MISMATCH');
        continue;
      }
      await client.query('BEGIN');
      try {
        await client.query(source);
        await client.query('INSERT INTO schema_migrations(version,checksum) VALUES ($1,$2)', [
          name,
          checksum,
        ]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock(218002)').catch(() => {});
    client.release();
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const url = process.env.MIGRATION_DATABASE_URL;
  if (!url) throw new Error('MIGRATION_DATABASE_URL is required');
  const pool = new pg.Pool({ connectionString: url });
  try {
    await migrate(pool);
    console.log('Catalog migrations applied.');
  } catch (error) {
    console.error('Migration failed:', error.code ?? error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
