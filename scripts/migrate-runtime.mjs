/**
 * Production-safe SQL migrator (idempotent). Used by the Docker entrypoint.
 * Records applied files in schema_migrations so reruns are skipped.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import postgres from 'postgres';

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error('migrate-runtime: DATABASE_URL is required');
  process.exit(1);
}

const dir = join(process.cwd(), 'db/migrations');
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

const sql = postgres(url, { max: 1 });

try {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  const appliedRows = await sql`SELECT id FROM schema_migrations`;
  const applied = new Set(appliedRows.map((r) => String(r.id)));

  for (const file of files) {
    if (applied.has(file)) {
      console.log('migrate-runtime: skip', file);
      continue;
    }
    const body = readFileSync(join(dir, file), 'utf8');
    await sql.unsafe(body);
    await sql`INSERT INTO schema_migrations (id) VALUES (${file})`;
    console.log('migrate-runtime: applied', file);
  }
  console.log('migrate-runtime: complete');
} catch (e) {
  console.error('migrate-runtime: failed', e instanceof Error ? e.message : e);
  process.exit(1);
} finally {
  await sql.end();
}
