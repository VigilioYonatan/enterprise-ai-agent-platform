import { Pool } from 'pg';
import { describe, expect, it } from 'vitest';

/** Real PostgreSQL integration suite: run only against a disposable migrated database. */
const database_url = process.env.DATABASE_URL_TEST;
async function checkedPool() {
  if (!database_url)
    throw Error('DATABASE_URL_TEST required; never run against production');
  const url = new URL(database_url);
  if (!/(_test|localhost|127\.0\.0\.1)/.test(url.pathname + url.hostname)) {
    throw Error(
      'Integration test DB must be an explicitly isolated test database',
    );
  }
  return new Pool({ connectionString: database_url, max: 2 });
}
describe('schema constraints and source-controlled SQL', () => {
  it('every applied migration has a 64-character SHA-256 digest', async () => {
    const pool = await checkedPool();
    try {
      const { rows } = await pool.query<{
        filename: string;
        checksum_sha256: string;
      }>(
        'SELECT filename,checksum_sha256 FROM schema_migrations ORDER BY filename',
      );
      expect(rows.length).toBeGreaterThanOrEqual(13);
      for (const row of rows)
        expect(row.checksum_sha256).toMatch(/^[a-f0-9]{64}$/);
    } finally {
      await pool.end();
    }
  });
  it('enforces unique workflow versions and run idempotency at SQL level', async () => {
    const pool = await checkedPool();
    try {
      const { rows } = await pool.query<{
        table_name: string;
        indexdef: string;
      }>(`
        SELECT tablename AS table_name,indexdef FROM pg_indexes
        WHERE tablename IN ('workflow_versions','runs')`);
      expect(
        rows.some(
          (row) =>
            row.table_name === 'workflow_versions' &&
            /UNIQUE/i.test(row.indexdef) &&
            /workflow_id, version/.test(row.indexdef),
        ),
      ).toBe(true);
      expect(
        rows.some(
          (row) =>
            row.table_name === 'runs' &&
            /UNIQUE/i.test(row.indexdef) &&
            /organization_id, created_by, idempotency_key/.test(row.indexdef),
        ),
      ).toBe(true);
    } finally {
      await pool.end();
    }
  });
});
