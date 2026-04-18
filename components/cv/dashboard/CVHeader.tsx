import Link from 'next/link';
import { LayoutTemplate } from 'lucide-react';
import { cvDashboardSecondary } from './cv-dashboard-utils';

/**
 * CV dashboard page title row.
 * Templates remains a peer action (same route as before).
 */
export function CVHeader() {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 space-y-1">
        <h1 className="font-display text-[1.75rem] font-bold leading-tight tracking-tight text-[var(--color-text-primary)] sm:text-[2rem]">
          CV
        </h1>
        <p className="max-w-xl text-sm text-[var(--color-muted)]">
          Manage your core CV and role-specific versions in one place.
        </p>
      </div>
      <Link
        href="/cv/templates"
        className={`${cvDashboardSecondary} shrink-0 gap-2 px-4 py-2.5 text-sm`}
      >
        <LayoutTemplate className="h-4 w-4 shrink-0" aria-hidden />
        Templates
      </Link>
    </div>
  );
}
