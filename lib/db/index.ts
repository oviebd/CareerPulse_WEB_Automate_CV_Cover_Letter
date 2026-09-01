import { sql } from 'drizzle-orm';

/** Lazy DB connection check. */
export async function checkDbConnection(): Promise<void> {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error('DATABASE_URL not set');
  const { getDb } = await import('./client');
  const db = getDb();
  await db.execute(sql`SELECT 1`);
}
