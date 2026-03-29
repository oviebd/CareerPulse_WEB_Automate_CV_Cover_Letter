const store = new Map<string, number>();

function key(userId: string): string {
  const d = new Date();
  return `${userId}:${d.getUTCFullYear()}-${d.getUTCMonth()}`;
}

export function getJdAnalyzeCountThisMonth(userId: string): number {
  return store.get(key(userId)) ?? 0;
}

export function incrementJdAnalyze(userId: string): void {
  const k = key(userId);
  store.set(k, (store.get(k) ?? 0) + 1);
}
