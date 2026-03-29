const buckets = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX = 10;

export function rateLimitHit(key: string): boolean {
  const now = Date.now();
  const arr = buckets.get(key) ?? [];
  const recent = arr.filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  buckets.set(key, recent);
  return recent.length > MAX;
}
