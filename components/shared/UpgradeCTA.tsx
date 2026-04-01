import Link from 'next/link';

export function UpgradeCTA({ className }: { className?: string }) {
  return (
    <div
      className={`glass-panel rounded-card border border-[var(--color-border)] p-6 ${className ?? ''}`}
    >
      <h3 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">Unlock more</h3>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        Higher tiers include more generations, ATS scoring, and the application
        tracker.
      </p>
      <Link
        href="/settings/billing"
        className="mt-4 inline-flex rounded-btn bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-[var(--color-primary-hover)]"
      >
        Compare plans
      </Link>
    </div>
  );
}
