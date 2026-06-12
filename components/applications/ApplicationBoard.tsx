'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import {
  APPLICATION_COLUMN_CONFIG,
  APPLICATION_COLUMNS,
  COLUMN_DB_STATUSES,
  jobStatusToColumn,
  type ApplicationColumn,
} from '@/lib/job-status-ui';
import { ApplicationCard } from '@/components/applications/ApplicationCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useJobApplications, useUpsertJobApplication } from '@/hooks/useTracker';
import type { Job } from '@/types/database';
import { cn } from '@/lib/utils';

function groupByColumn(apps: Job[]): Record<ApplicationColumn, Job[]> {
  const groups = Object.fromEntries(
    APPLICATION_COLUMNS.map((c) => [c, [] as Job[]])
  ) as Record<ApplicationColumn, Job[]>;

  for (const app of apps) {
    const col = jobStatusToColumn(app.status);
    if (col && groups[col]) {
      groups[col].push(app);
    }
  }
  return groups;
}

export function ApplicationBoard({ compact }: { compact?: boolean }) {
  const { data: apps = [], isLoading } = useJobApplications();
  const createApp = useUpsertJobApplication();

  const tracked = useMemo(
    () => apps.filter((a) => a.status !== 'none'),
    [apps]
  );
  const grouped = useMemo(() => groupByColumn(tracked), [tracked]);

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {APPLICATION_COLUMNS.map((col) => (
          <Skeleton key={col} className="h-64 rounded-xl" />
        ))}
      </div>
    );
  }

  if (tracked.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-faint)]/50 px-6 py-16 text-center">
        <p className="text-4xl">📋</p>
        <p className="mt-4 font-semibold text-[var(--color-text-primary)]">
          No applications yet
        </p>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Paste a job description to create your first tailored application.
        </p>
        <Link href="/applications/new" className="mt-6 inline-block">
          <Button variant="primary">+ Add Job</Button>
        </Link>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid gap-3',
        compact
          ? 'sm:grid-cols-2 lg:grid-cols-3'
          : 'sm:grid-cols-2 lg:grid-cols-5'
      )}
    >
      {APPLICATION_COLUMNS.map((col) => {
        const cfg = APPLICATION_COLUMN_CONFIG[col];
        const items = grouped[col];
        return (
          <div
            key={col}
            className="flex min-h-[12rem] flex-col rounded-xl border border-[var(--color-border)]/40 bg-[var(--color-surface-faint)]/60 p-3"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3
                className={cn(
                  'text-xs font-semibold uppercase tracking-wide',
                  cfg.textColor
                )}
              >
                {cfg.emoji} {cfg.label}
              </h3>
              <span className="rounded-full bg-[var(--color-surface)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-muted)]">
                {items.length}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-2">
              {items.map((job) => (
                <ApplicationCard key={job.id} job={job} />
              ))}
              {col === 'wishlist' && items.length === 0 ? (
                <button
                  type="button"
                  className="rounded-lg border border-dashed border-[var(--color-border)] py-4 text-xs text-[var(--color-muted)] hover:border-[var(--color-primary-300)] hover:text-[var(--color-primary-500)]"
                  onClick={() =>
                    createApp.mutate({
                      company_name: 'New company',
                      job_title: 'Role title',
                      status: COLUMN_DB_STATUSES.wishlist[0],
                    })
                  }
                >
                  + Quick add
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
