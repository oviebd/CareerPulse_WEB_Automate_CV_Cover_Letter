/** Convert Drizzle camelCase row to snake_case API shape. */
export function toSnake<T extends Record<string, unknown>>(row: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const snake = key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
    out[snake] = value;
  }
  return out;
}

/** Convert snake_case API payloads to Drizzle camelCase column names. */
export function fromSnake(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value === undefined) continue;
    const camel = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
    out[camel] = value;
  }
  return out;
}

export function rowsToSnake(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map((r) => toSnake(r));
}
