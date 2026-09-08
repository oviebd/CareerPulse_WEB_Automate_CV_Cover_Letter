import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

type PostgresClient = ReturnType<typeof postgres>;
type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as {
  __careerpulsePg?: PostgresClient;
  __careerpulseDb?: DrizzleDb;
};

function poolSize() {
  const raw = Number.parseInt(process.env.DATABASE_POOL_MAX ?? '', 10);
  if (Number.isFinite(raw) && raw > 0) return Math.min(raw, 20);
  return process.env.NODE_ENV === 'development' ? 3 : 10;
}

export function getDb() {
  if (globalForDb.__careerpulseDb) return globalForDb.__careerpulseDb;
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error('DATABASE_URL is required for postgres backend');
  const client = postgres(url, {
    max: poolSize(),
    idle_timeout: 20,
    max_lifetime: 60 * 30,
    connect_timeout: 10,
  });
  const db = drizzle(client, { schema });
  globalForDb.__careerpulsePg = client;
  globalForDb.__careerpulseDb = db;
  return db;
}

export async function closeDb() {
  const client = globalForDb.__careerpulsePg;
  if (!client) return;
  await client.end({ timeout: 5 });
  globalForDb.__careerpulsePg = undefined;
  globalForDb.__careerpulseDb = undefined;
}

export { schema };
