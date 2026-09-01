export type DataBackend = 'postgres';

/** Persistence layer for API routes. Postgres is the only backend. */
export function getDataBackend(): DataBackend {
  return 'postgres';
}

export function isPostgresBackend(): boolean {
  return true;
}
