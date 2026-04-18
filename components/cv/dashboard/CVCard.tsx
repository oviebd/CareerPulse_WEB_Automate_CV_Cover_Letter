'use client';

import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CoreCVVersion } from '@/hooks/useCV';
import type { JobSpecificCV } from '@/types';
import { relativeTime } from './cv-dashboard-utils';

const shell =
  'group flex min-h-[4.5rem] items-stretch overflow-hidden rounded-2xl border border-[var(--color-border)]/90 bg-[var(--color-surface)] shadow-sm transition duration-200 hover:-translate-y-px hover:border-[var(--color-primary)]/25 hover:shadow-md';

/**
 * Core CV row: primary column opens editor; actions stay explicit for clarity and delete flow.
 */
export function CoreCVCard({
  cv,
  onDelete,
}: {
  cv: CoreCVVersion;
  onDelete: () => void;
}) {
  const lastTouch = relativeTime(cv.updated_at || cv.created_at);
  const editHref = `/cv/edit/${encodeURIComponent(cv.id)}`;

  return (
    <div className={shell}>
      <Link
        href={editHref}
        className="flex min-w-0 flex-1 flex-col justify-center gap-2 p-4 text-left outline-none transition hover:bg-[var(--color-control-bg)]/40 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40"
      >
        <div className="min-w-0">
          <p className="truncate font-semibold text-[var(--color-text-primary)]">
            {cv.full_name ?? 'Untitled CV'}
          </p>
          <p className="mt-0.5 text-xs text-[var(--color-muted)]">
            Last updated {lastTouch}
          </p>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
            <span>Completion</span>
            <span className="tabular-nums text-[var(--color-text-secondary)]">
              {cv.completion_percentage}%
            </span>
          </div>
          <Progress value={cv.completion_percentage} className="h-1.5" />
        </div>
      </Link>

      <div className="flex shrink-0 flex-col justify-center gap-1 border-l border-[var(--color-border)]/70 bg-[var(--color-surface)]/80 p-2 sm:p-3">
        <Link href={editHref} className="block max-md:w-full">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-full gap-1.5 text-[var(--color-text-secondary)] opacity-100 transition-opacity hover:text-[var(--color-text-primary)] sm:w-auto md:opacity-0 md:group-hover:opacity-100 [@media(hover:none)]:opacity-100"
          >
            <Pencil className="h-3.5 w-3.5 opacity-70" aria-hidden />
            Edit
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-[var(--color-muted)] opacity-100 transition-opacity hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 md:opacity-0 md:group-hover:opacity-100 [@media(hover:none)]:opacity-100"
          onClick={(e) => {
            e.preventDefault();
            onDelete();
          }}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

/**
 * Job-specific CV row — company first, role secondary; optional profile completion badge.
 */
export function JobCVCard({
  cv,
  onDelete,
}: {
  cv: JobSpecificCV;
  onDelete: () => void;
}) {
  const editHref = `/cv/job-specific/${cv.id}/edit`;
  const company =
    cv.company_name?.trim() ||
    (cv.job_title ? `Role: ${cv.job_title}` : 'Untitled role');

  return (
    <div className={shell}>
      <Link
        href={editHref}
        className="flex min-w-0 flex-1 flex-col justify-center gap-1 p-4 text-left outline-none transition hover:bg-[var(--color-control-bg)]/40 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40"
      >
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-semibold text-[var(--color-text-primary)]">{company}</p>
          {typeof cv.completion_percentage === 'number' ? (
            <Badge variant="info" className="tabular-nums">
              {cv.completion_percentage}% profile
            </Badge>
          ) : null}
        </div>
        <p className="truncate text-sm text-[var(--color-muted)]">{cv.job_title}</p>
        <p className="text-[11px] text-[var(--color-muted)]/90">
          Saved {relativeTime(cv.created_at)}
        </p>
      </Link>

      <div className="flex shrink-0 flex-col justify-center gap-1 border-l border-[var(--color-border)]/70 bg-[var(--color-surface)]/80 p-2 sm:p-3">
        <Link href={editHref} className="block max-md:w-full">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-full gap-1.5 opacity-100 transition-opacity sm:w-auto md:opacity-0 md:group-hover:opacity-100 [@media(hover:none)]:opacity-100"
          >
            <Pencil className="h-3.5 w-3.5 opacity-70" aria-hidden />
            Edit
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 text-[var(--color-muted)] hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400',
            'opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 [@media(hover:none)]:opacity-100'
          )}
          onClick={(e) => {
            e.preventDefault();
            onDelete();
          }}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
