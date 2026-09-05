/** Timestamp / date columns that Drizzle expects as `Date` (not ISO strings). */
const TIMESTAMP_CAMEL_KEYS = new Set([
  'createdAt',
  'updatedAt',
  'savedAt',
  'appliedAt',
  'interviewAt',
  'offerAt',
  'deadline',
  'emailVerified',
  'subscriptionExpiresAt',
  'trialEndsAt',
  'startedAt',
  'completedAt',
  'lastAssessedAt',
  'interviewDate',
  'billingPeriodStart',
  'billingPeriodEnd',
]);

function coerceTimestampValue(key: string, value: unknown): unknown {
  if (typeof value !== 'string' || !TIMESTAMP_CAMEL_KEYS.has(key)) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed;
}

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
    out[camel] = coerceTimestampValue(camel, value);
  }
  return out;
}

export function rowsToSnake(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map((r) => toSnake(r));
}
