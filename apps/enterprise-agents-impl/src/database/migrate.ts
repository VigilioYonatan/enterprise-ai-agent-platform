import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';
import { databaseUrl } from '../shared/config/database-credentials';

/** Single-session advisory lock; each migration is atomic and verified by SHA-256. */
async function migrate() {
  const client = new Client({ connectionString: databaseUrl() });
  await client.connect();
  try {
    await client.query('SELECT pg_advisory_lock(98234571)');
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      filename text PRIMARY KEY, checksum_sha256 varchar(64),
      applied_at timestamptz NOT NULL DEFAULT now())`);
    await client.query(
      'ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS checksum_sha256 varchar(64)',
    );
    const folder = join(process.cwd(), 'migrations');
    const filenames = readdirSync(folder)
      .filter((name) => /^\d+_.+\.sql$/.test(name))
      .sort();
    for (const filename of filenames) {
      const contents = readFileSync(join(folder, filename), 'utf8');
      const checksum = createHash('sha256').update(contents).digest('hex');
      const previous = await client.query<{ checksum_sha256: string | null }>(
        'SELECT checksum_sha256 FROM schema_migrations WHERE filename=$1',
        [filename],
      );
      if (previous.rows.length) {
        if (previous.rows[0].checksum_sha256 !== checksum) {
          throw Error(
            `Migration ${filename} has changed or lacks provenance. Reconcile legacy migration checksums manually before upgrading; never rewrite executed SQL.`,
          );
        }
        continue;
      }
      await client.query('BEGIN');
      try {
        await client.query(contents);
        await client.query(
          'INSERT INTO schema_migrations(filename,checksum_sha256) VALUES($1,$2)',
          [filename, checksum],
        );
        await client.query('COMMIT');
        console.log('Applied', filename, checksum);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock(98234571)').catch(() => {});
    await client.end();
  }
}
migrate().catch((error) => {
  console.error(
    'Migration error:',
    error instanceof Error ? error.message : 'unknown',
  );
  process.exitCode = 1;
});
