export function utcMonthKey(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function periodKeyFor(kind: 'lifetime' | 'monthly'): string {
  return kind === 'lifetime' ? 'lifetime' : utcMonthKey();
}
