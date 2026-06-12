'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Check,
  ChevronDown,
  ExternalLink,
  FileText,
  Loader2,
  Mail,
  Pencil,
  Trash2,
} from 'lucide-react';
import type { Job, JobStatus } from '@/types/database';
import {
  APPLICATION_COLUMN_CONFIG,
  APPLICATION_COLUMNS,
  columnToDefaultStatus,
  jobStatusToColumn,
  type ApplicationColumn,
} from '@/lib/job-status-ui';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

function formatRelativeCreated(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

export function ApplicationCard({ job }: { job: Job }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [statusOpen, setStatusOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [optimisticStatus, setOptimisticStatus] = useState<JobStatus | null>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const deleteRef = useRef<HTMLDivElement>(null);

  const displayStatus = optimisticStatus ?? job.status;
  const column = jobStatusToColumn(displayStatus);
  const cfg = column ? APPLICATION_COLUMN_CONFIG[column] : null;

  const patchColumn = useCallback(
    async (nextColumn: ApplicationColumn) => {
      const next = columnToDefaultStatus(nextColumn);
      const prev = optimisticStatus ?? job.status;
      setOptimisticStatus(next);
      setStatusBusy(true);
      try {
        const res = await fetch(`/api/jobs/${job.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: next }),
        });
        if (!res.ok) throw new Error('patch_failed');
        toast(`Moved to ${APPLICATION_COLUMN_CONFIG[nextColumn].label}`, 'success');
        setOptimisticStatus(null);
        void qc.invalidateQueries({ queryKey: ['job-applications'] });
        void qc.invalidateQueries({ queryKey: ['tracked-jobs-count'] });
      } catch {
        setOptimisticStatus(prev);
        toast('Could not update status', 'error');
      } finally {
        setStatusBusy(false);
        setStatusOpen(false);
      }
    },
    [job.id, job.status, optimisticStatus, toast, qc]
  );

  const handleDelete = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${job.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('delete_failed');
      toast('Application removed', 'success');
      void qc.invalidateQueries({ queryKey: ['job-applications'] });
      void qc.invalidateQueries({ queryKey: ['tracked-jobs-count'] });
    } catch {
      toast('Could not remove application', 'error');
    } finally {
      setDeleteOpen(false);
    }
  }, [job.id, toast, qc]);

  const cvs = job.cvs ?? [];
  const cls = job.cover_letters ?? [];
  const cvId = cvs[0]?.id;
  const clId = cls[0]?.id;

  return (
    <div className="rounded-xl border border-[var(--color-border)]/50 bg-[var(--color-surface)] p-3 shadow-sm transition hover:shadow-md">
      <div className="flex items-start gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary-100)]">
          <Building2 className="h-4 w-4 text-[var(--color-primary-500)]" />
        </div>
        <div className="min-w-0 flex-1">
          <Link
            href={`/applications/${job.id}`}
            className="block font-semibold leading-snug text-[var(--color-text-primary)] hover:text-[var(--color-primary-500)]"
          >
            {job.job_title || 'Untitled role'}
          </Link>
          <p className="truncate text-xs text-[var(--color-muted)]">
            {job.company_name || 'Company'}
          </p>
          <p className="mt-1 text-[10px] text-[var(--color-muted)]">
            {formatRelativeCreated(job.created_at)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {cvId ? (
          <Link
            href={`/cv/edit/${cvId}?tailored=true`}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-muted)] hover:bg-[var(--color-hover-surface)]"
            title="Edit CV"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Link>
        ) : null}
        {cvId ? (
          <span className="inline-flex h-7 w-7 items-center justify-center text-[var(--color-muted)]" title="CV attached">
            <FileText className="h-3.5 w-3.5" />
          </span>
        ) : null}
        {clId ? (
          <Link
            href={`/cover-letters/${clId}`}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-muted)] hover:bg-[var(--color-hover-surface)]"
            title="Cover letter"
          >
            <Mail className="h-3.5 w-3.5" />
          </Link>
        ) : null}
        {job.job_url ? (
          <a
            href={job.job_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-muted)] hover:bg-[var(--color-hover-surface)]"
            title="Job posting"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div ref={statusRef} className="relative min-w-0 flex-1">
          <button
            type="button"
            disabled={statusBusy}
            onClick={() => setStatusOpen((o) => !o)}
            className={cn(
              'inline-flex w-full items-center justify-between gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold',
              cfg
                ? cn(cfg.bgColor, cfg.textColor, 'border-transparent')
                : 'border-[var(--color-border)] text-[var(--color-muted)]'
            )}
          >
            {statusBusy ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : cfg ? (
              <>
                <span>{cfg.emoji}</span>
                <span className="truncate">{cfg.label}</span>
              </>
            ) : (
              'Set status'
            )}
            <ChevronDown className="h-3 w-3 shrink-0" />
          </button>
          {statusOpen ? (
            <div className="absolute left-0 z-30 mt-1 w-40 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-lg">
              {APPLICATION_COLUMNS.map((col) => {
                const c = APPLICATION_COLUMN_CONFIG[col];
                const sel = column === col;
                return (
                  <button
                    key={col}
                    type="button"
                    className="flex w-full items-center gap-2 px-2 py-2 text-left text-xs hover:bg-[var(--color-hover-surface)]"
                    onClick={() => void patchColumn(col)}
                  >
                    {sel ? <Check className="h-3 w-3 text-[var(--color-primary-500)]" /> : <span className="w-3" />}
                    {c.emoji} {c.label}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
        <div ref={deleteRef} className="relative shrink-0">
          <button
            type="button"
            className="rounded-md p-1 text-[var(--color-muted)] hover:bg-red-500/10 hover:text-[var(--color-danger)]"
            onClick={() => setDeleteOpen((v) => !v)}
            aria-label="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          {deleteOpen ? (
            <div className="absolute right-0 z-30 mt-1 w-48 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-xs shadow-lg">
              <p className="font-medium">Delete application?</p>
              <div className="mt-2 flex justify-end gap-1">
                <Button size="sm" variant="ghost" onClick={() => setDeleteOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" variant="primary" onClick={() => void handleDelete()}>
                  Delete
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
