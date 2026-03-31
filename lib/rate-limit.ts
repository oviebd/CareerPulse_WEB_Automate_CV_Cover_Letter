const buckets = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX = 10;

let lastCleanup = Date.now();

function maybeCleanup() {
  const now = Date.now();
  if (now - lastCleanup < WINDOW_MS) return;
  lastCleanup = now;
  for (const [key, arr] of buckets) {
    const recent = arr.filter((t) => now - t < WINDOW_MS);
    if (recent.length === 0) buckets.delete(key);
    else buckets.set(key, recent);
  }
}

export function rateLimitHit(key: string): boolean {
  maybeCleanup();
  const now = Date.now();
  const arr = buckets.get(key) ?? [];
  const recent = arr.filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  buckets.set(key, recent);
  return recent.length > MAX;
}
