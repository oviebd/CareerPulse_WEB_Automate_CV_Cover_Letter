import Link from 'next/link';
import { LayoutTemplate, Upload, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { cvDashboardPrimary } from './cv-dashboard-utils';

const cardBase =
  'group relative flex flex-col rounded-2xl border bg-[var(--color-surface)] p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[var(--color-border-hover)] hover:shadow-md';

const iconWrap = (className: string) =>
  `inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${className}`;

/**
 * Quick-start actions: Upload, Build, Tailor.
 * Tailor is visually primary (accent border / surface) — fixes equal-weight hero cards.
 */
export function CVActionCards() {
  return (
    <div className="mb-8 grid gap-3 sm:grid-cols-3 sm:gap-4">
      <div
        className={cn(
          cardBase,
          'border-[var(--color-border)]/80'
        )}
      >
        <div className="flex items-start gap-3">
          <span className={iconWrap('bg-blue-500/10 text-blue-600 dark:text-blue-400')}>
            <Upload className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Upload</h2>
            <p className="text-xs leading-relaxed text-[var(--color-muted)]">
              PDF or DOCX up to 10MB. We extract structure with AI.
            </p>
          </div>
        </div>
        <div className="mt-3">
          <Link href="/cv/upload" className={`${cvDashboardPrimary} w-full sm:w-auto`}>
            Upload CV
          </Link>
        </div>
      </div>

      <div
        className={cn(
          cardBase,
          'border-[var(--color-border)]/80'
        )}
      >
        <div className="flex items-start gap-3">
          <span className={iconWrap('bg-indigo-500/10 text-indigo-600 dark:text-indigo-400')}>
            <LayoutTemplate className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
              Build from Scratch
            </h2>
            <p className="text-xs leading-relaxed text-[var(--color-muted)]">
              Start with a fresh template and fill in your details manually.
            </p>
          </div>
        </div>
        <div className="mt-3">
          <Link href="/cv/edit?new=1" className={`${cvDashboardPrimary} w-full sm:w-auto`}>
            Build CV
          </Link>
        </div>
      </div>

      <div
        className={cn(
          cardBase,
          'z-[1] border-[var(--color-primary)]/35 bg-gradient-to-br from-[var(--color-primary)]/[0.07] via-[var(--color-surface)] to-[var(--color-surface)] shadow-[0_0_0_1px_rgba(99,102,241,0.12)] sm:shadow-md sm:ring-2 sm:ring-[var(--color-primary)]/25'
        )}
      >
        <div className="flex items-start gap-3">
          <span
            className={iconWrap(
              'bg-[var(--color-primary)]/15 text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/20'
            )}
          >
            <Wand2 className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
              Tailor for a Job
            </h2>
            <p className="text-xs leading-relaxed text-[var(--color-muted)]">
              Paste a job description and AI will optimise your CV for that role.
            </p>
          </div>
        </div>
        <div className="mt-3">
          <Link href="/cv/optimise" className={`${cvDashboardPrimary} w-full shadow-sm sm:w-auto`}>
            Tailor My CV
          </Link>
        </div>
      </div>
    </div>
  );
}
