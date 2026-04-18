/** Shared copy for primary/secondary CTAs on the CV overview (matches previous page behavior). */
export const cvDashboardBtn =
  'inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition';

export const cvDashboardPrimary = `${cvDashboardBtn} bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]`;

export const cvDashboardSecondary = `${cvDashboardBtn} border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-control-bg)]`;

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
