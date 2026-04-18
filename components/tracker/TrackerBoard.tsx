'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Building2,
  Check,
  ChevronDown,
  ExternalLink,
  FileText,
  Loader2,
  Mail,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import type { Job, JobStatus } from '@/types/database';
import { JOB_STATUS_CONFIG } from '@/types';
import { TRACKABLE_JOB_STATUSES } from '@/lib/job-status';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useJobApplications, useUpsertJobApplication } from '@/hooks/useTracker';
import { cn } from '@/lib/utils';

type FilterKey = 'all' | JobStatus;

const FILTER_CHIPS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  ...TRACKABLE_JOB_STATUSES.map((s) => ({
    key: s as FilterKey,
    label: JOB_STATUS_CONFIG[s].label,
  })),
];

function formatRelativeCreated(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  onOutside: () => void,
  active: boolean
) {
  useEffect(() => {
    if (!active) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [active, onOutside, ref]);
}

export function TrackerBoard() {
  const { data: apps = [], isLoading } = useJobApplications();
  const createApp = useUpsertJobApplication();
  const { toast } = useToast();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const moreFiltersRef = useRef<HTMLDivElement>(null);
  useClickOutside(moreFiltersRef, () => setMoreFiltersOpen(false), moreFiltersOpen);

  const filtered = useMemo(() => {
    if (filter === 'all') return apps;
    return apps.filter((a) => a.status === filter);
  }, [apps, filter]);

  const primaryChips = FILTER_CHIPS.slice(0, 6);
  const overflowChips = FILTER_CHIPS.slice(6);

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 sm:gap-x-3">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
            Job Tracker
          </h1>
          <span className="text-sm text-[var(--color-muted)]">
            {apps.length} job{apps.length === 1 ? '' : 's'} being tracked
          </span>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            size="sm"
            variant="primary"
            onClick={() =>
              createApp.mutate({
                company_name: 'New company',
                job_title: 'Role title',
                status: 'apply_later',
              })
            }
            loading={createApp.isPending}
          >
            + Add Job
          </Button>
          <Link href="/cv/optimise">
            <Button size="sm" variant="secondary">
              Optimise a CV
            </Button>
          </Link>
        </div>
      </header>

      <div className="relative">
        {/*
          Do not use overflow-x-auto here: paired with overflow-x, overflow-y cannot stay
          visible, so any dropdown below the row (More menu) gets clipped.
          Chips use flex-wrap; horizontal scrolling is not required for the layout.
        */}
        <div className="-mx-0.5 flex flex-wrap items-center gap-2 px-0.5 pb-1">
          {primaryChips.map((c) => (
            <FilterChip
              key={String(c.key)}
              label={c.label}
              statusKey={c.key}
              active={filter === c.key}
              onSelect={() => setFilter(c.key)}
            />
          ))}
          {overflowChips.length > 0 ? (
            <div ref={moreFiltersRef} className="relative shrink-0">
              <button
                type="button"
                aria-expanded={moreFiltersOpen}
                aria-haspopup="listbox"
                onClick={() => setMoreFiltersOpen((v) => !v)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium transition duration-200',
                  overflowChips.some((c) => filter === c.key)
                    ? 'border-transparent bg-[var(--color-primary-500)] text-white shadow-sm ring-1 ring-[var(--color-primary-500)]/30'
                    : 'border-[var(--color-border)]/50 bg-[var(--color-control-bg)] text-[var(--color-muted)] shadow-sm hover:border-[var(--color-border)] hover:bg-[var(--color-hover-surface)] hover:text-[var(--color-text-primary)]'
                )}
              >
                More
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {moreFiltersOpen ? (
                <div
                  className="absolute left-0 top-full z-[80] mt-2 min-w-[200px] rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-surface)] py-1 shadow-lg shadow-black/5"
                  role="listbox"
                >
                  {overflowChips.map((c) => (
                    <button
                      key={String(c.key)}
                      type="button"
                      className={cn(
                        'flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-[var(--color-hover-surface)]',
                        filter === c.key
                          ? 'bg-[var(--color-primary-500)]/10 font-medium text-[var(--color-primary-500)]'
                          : 'text-[var(--color-text-primary)]'
                      )}
                      onClick={() => {
                        setFilter(c.key);
                        setMoreFiltersOpen(false);
                      }}
                    >
                      {filter === c.key ? (
                        <Check className="h-4 w-4 shrink-0" />
                      ) : (
                        <span className="w-4 shrink-0" />
                      )}
                      {c.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--color-border)]/50 bg-[var(--color-surface-faint)]/70 p-4 shadow-sm sm:p-6">
        {isLoading ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-36 w-full rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState hasAnyJobs={apps.length > 0} />
        ) : (
          <motion.div layout className="flex flex-col gap-4">
            <AnimatePresence mode="popLayout">
              {filtered.map((app, index) => (
                <JobTrackerCard
                  key={app.id}
                  job={app}
                  index={index}
                  toast={toast}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  statusKey,
  active,
  onSelect,
}: {
  label: string;
  statusKey: FilterKey;
  active: boolean;
  onSelect: () => void;
}) {
  const cfg =
    statusKey !== 'all'
      ? JOB_STATUS_CONFIG[statusKey as Exclude<JobStatus, 'none'>]
      : null;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'shrink-0 rounded-full border px-3 py-2 text-sm font-medium transition duration-200',
        active
          ? cfg
            ? cn(
                cfg.bgColor,
                cfg.textColor,
                'border-transparent shadow-sm ring-1 ring-black/5 dark:ring-white/10'
              )
            : 'border-transparent bg-[var(--color-primary-500)] text-white shadow-sm ring-1 ring-[var(--color-primary-500)]/25'
          : 'border-[var(--color-border)]/40 bg-[var(--color-control-bg)] text-[var(--color-muted)] shadow-sm hover:border-[var(--color-border)] hover:bg-[var(--color-hover-surface)] hover:text-[var(--color-text-primary)]'
      )}
    >
      {label}
    </button>
  );
}

function EmptyState({ hasAnyJobs }: { hasAnyJobs: boolean }) {
  return (
    <div className="mx-auto max-w-md rounded-xl border border-dashed border-[var(--color-border)]/60 bg-[var(--color-surface)]/80 px-6 py-12 text-center shadow-sm sm:px-8 sm:py-14">
      <div className="text-4xl">📋</div>
      <p className="mt-4 font-semibold text-[var(--color-text-primary)]">
        {hasAnyJobs ? 'No jobs match this filter' : 'No jobs being tracked yet'}
      </p>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Generate a tailored CV to start tracking jobs
      </p>
      <Link
        href="/cv/optimise"
        className="mt-6 inline-flex rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95"
      >
        Optimise a CV →
      </Link>
    </div>
  );
}

function JobTrackerCard({
  job,
  index,
  toast,
}: {
  job: Job;
  index: number;
  toast: ReturnType<typeof useToast>['toast'];
}) {
  const qc = useQueryClient();
  const [statusOpen, setStatusOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [optimisticStatus, setOptimisticStatus] = useState<JobStatus | null>(
    null
  );
  const [preview, setPreview] = useState<
    | { type: 'cv'; id: string }
    | { type: 'cover_letter'; id: string }
    | null
  >(null);

  const statusRef = useRef<HTMLDivElement>(null);
  const deleteRef = useRef<HTMLDivElement>(null);
  useClickOutside(statusRef, () => setStatusOpen(false), statusOpen);
  useClickOutside(deleteRef, () => setDeleteOpen(false), deleteOpen);

  const displayStatus = optimisticStatus ?? job.status;
  const cfg =
    displayStatus !== 'none'
      ? JOB_STATUS_CONFIG[displayStatus as Exclude<JobStatus, 'none'>]
      : null;

  const patchStatus = useCallback(
    async (next: JobStatus) => {
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
        const label =
          next === 'none'
            ? 'None'
            : JOB_STATUS_CONFIG[next as Exclude<JobStatus, 'none'>].label;
        toast(`Status updated to ${label}`, 'success');
        setOptimisticStatus(null);
        void qc.invalidateQueries({ queryKey: ['job-applications'] });
        void qc.invalidateQueries({ queryKey: ['job-detail'] });
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
      const body = (await res.json()) as {
        deleted?: boolean;
        reason?: string;
      };
      if (!res.ok) throw new Error('delete_failed');
      if (body.deleted) {
        toast('Job deleted', 'success');
      } else {
        toast('Job removed from tracker (CV preserved)', 'success');
      }
      void qc.invalidateQueries({ queryKey: ['job-applications'] });
      void qc.invalidateQueries({ queryKey: ['job-detail'] });
      void qc.invalidateQueries({ queryKey: ['tracked-jobs-count'] });
    } catch {
      toast('Could not remove job', 'error');
    } finally {
      setDeleteOpen(false);
    }
  }, [job.id, toast, qc]);

  const cvs = job.cvs ?? [];
  const cls = job.cover_letters ?? [];
  const hasCv = cvs.length > 0;
  const hasCl = cls.length > 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
      className="overflow-visible rounded-xl border border-[var(--color-border)]/45 bg-[var(--color-surface)] shadow-[var(--shadow-sm)] ring-1 ring-[var(--color-surface-faint)] transition-shadow duration-200 hover:shadow-[var(--shadow-md)]"
    >
      <div className="p-4 sm:p-6">
        <div className="flex gap-4">
          <div
            className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-100)] shadow-sm ring-1 ring-[var(--color-primary-500)]/10"
            aria-hidden
          >
            <Building2 className="h-5 w-5 text-[var(--color-primary-500)]" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
              <div className="min-w-0 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                  {job.company_name || 'Company'}
                </p>
                <h3 className="text-lg font-semibold leading-snug tracking-tight text-[var(--color-text-primary)]">
                  {job.job_title || 'Untitled role'}
                </h3>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--color-muted)]">
                  {job.location ? <span>{job.location}</span> : null}
                  {job.location && job.job_url ? <span>·</span> : null}
                  {job.job_url ? (
                    <a
                      href={job.job_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex max-w-[200px] items-center gap-1 truncate font-medium text-[var(--color-primary-500)] hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                      Link
                    </a>
                  ) : null}
                </div>
                <p className="text-xs text-[var(--color-muted)]">
                  Added {formatRelativeCreated(job.created_at)}
                </p>
              </div>

              <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:shrink-0 sm:items-end">
                <div ref={statusRef} className="relative w-full sm:w-auto">
                  <button
                    type="button"
                    disabled={statusBusy}
                    onClick={() => setStatusOpen((o) => !o)}
                    className={cn(
                      'inline-flex w-full min-w-0 items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold shadow-sm transition sm:w-auto sm:min-w-[8rem] sm:justify-between',
                      cfg
                        ? cn(
                            cfg.bgColor,
                            cfg.textColor,
                            'border-transparent ring-1 ring-black/5 dark:ring-white/10'
                          )
                        : 'border-[var(--color-border)]/50 bg-[var(--color-surface-faint)] text-[var(--color-text-secondary)]'
                    )}
                  >
                    {statusBusy ? (
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                    ) : cfg ? (
                      <>
                        <span className="shrink-0">{cfg.emoji}</span>
                        <span className="min-w-0 truncate text-left sm:flex-1">
                          {cfg.label}
                        </span>
                      </>
                    ) : (
                      'Status'
                    )}
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-80" />
                  </button>
                  {statusOpen ? (
                    <div className="absolute right-0 z-30 mt-2 w-56 rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-surface)] py-1 shadow-lg">
                      {TRACKABLE_JOB_STATUSES.map((s) => {
                        const c = JOB_STATUS_CONFIG[s];
                        const sel = displayStatus === s;
                        return (
                          <button
                            key={s}
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-hover-surface)]"
                            onClick={() => void patchStatus(s)}
                          >
                            {sel ? (
                              <Check className="h-4 w-4 text-[var(--color-primary-500)]" />
                            ) : (
                              <span className="w-4" />
                            )}
                            <span>
                              {c.emoji} {c.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>

                <div
                  className="flex flex-wrap items-center justify-end gap-2"
                  role="toolbar"
                  aria-label="Job actions"
                >
                  <div className="inline-flex items-center gap-0.5 rounded-xl border border-[var(--color-border)]/45 bg-[var(--color-surface-faint)] p-1 shadow-sm">
                    {hasCv ? (
                      <Link
                        href={`/cv/job-specific/${cvs[0].id}/edit`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-muted)] transition hover:bg-[var(--color-hover-surface)] hover:text-[var(--color-text-primary)]"
                        title="Edit CV"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                    ) : null}
                    {hasCv ? (
                      <button
                        type="button"
                        onClick={() => setPreview({ type: 'cv', id: cvs[0].id })}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-muted)] transition hover:bg-[var(--color-hover-surface)] hover:text-[var(--color-text-primary)]"
                        title="View CV"
                        aria-label="View CV preview"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                    ) : null}
                    {hasCl ? (
                      <button
                        type="button"
                        onClick={() =>
                          setPreview({ type: 'cover_letter', id: cls[0].id })
                        }
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-muted)] transition hover:bg-[var(--color-hover-surface)] hover:text-[var(--color-text-primary)]"
                        title="View cover letter"
                        aria-label="View cover letter preview"
                      >
                        <Mail className="h-4 w-4" />
                      </button>
                    ) : null}
                    <div ref={deleteRef} className="relative">
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-muted)] transition hover:bg-red-500/10 hover:text-[var(--color-danger)]"
                        aria-label="Delete job"
                        onClick={() => setDeleteOpen((v) => !v)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      {deleteOpen ? (
                        <div className="absolute right-0 z-30 mt-2 w-72 max-w-[calc(100vw-2.5rem)] rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-surface)] p-3 text-sm text-[var(--color-text-primary)] shadow-lg">
                          <p className="font-medium">Delete this job?</p>
                          {(hasCv || hasCl) && (
                            <p className="mt-1 text-xs text-[var(--color-muted)]">
                              {hasCv
                                ? 'This job has a linked CV — status will be set to None instead of deleting.'
                                : 'This job has a linked cover letter — status will be set to None instead of deleting.'}
                            </p>
                          )}
                          <div className="mt-3 flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleteOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => void handleDelete()}
                            >
                              Confirm
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {preview ? (
        <TrackerPreviewModal
          preview={preview}
          jobTitle={job.job_title}
          company={job.company_name}
          onClose={() => setPreview(null)}
          toast={toast}
        />
      ) : null}
    </motion.div>
  );
}

function TrackerPreviewModal({
  preview,
  jobTitle,
  company,
  onClose,
  toast,
}: {
  preview: { type: 'cv'; id: string } | { type: 'cover_letter'; id: string };
  jobTitle: string;
  company: string;
  onClose: () => void;
  toast: ReturnType<typeof useToast>['toast'];
}) {
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        if (preview.type === 'cv') {
          const profRes = await fetch(`/api/cvs/${preview.id}`);
          if (!profRes.ok) throw new Error('cv');
          const profile = (await profRes.json()) as Record<string, unknown>;
          const res = await fetch('/api/cv/preview-html', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              template_id:
                (profile.preferred_template_id as string) || 'classic',
              accent_color: (profile.accent_color as string) || '#6C63FF',
              cv: profile,
            }),
          });
          const text = await res.text();
          if (!cancelled) setHtml(text);
        } else {
          const res = await fetch('/api/cover-letter/preview-html', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cover_letter_id: preview.id,
            }),
          });
          const text = await res.text();
          if (!cancelled) setHtml(text);
        }
      } catch {
        if (!cancelled) {
          setHtml('');
          toast('Could not load preview', 'error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [preview, toast]);

  const title =
    preview.type === 'cv' ? 'CV Preview' : 'Cover Letter Preview';

  const editHref =
    preview.type === 'cv'
      ? `/cv/job-specific/${preview.id}/edit`
      : `/cover-letters/${preview.id}`;

  const download = async () => {
    setDownloading(true);
    try {
      if (preview.type === 'cv') {
        const res = await fetch('/api/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'cv',
            job_cv_id: preview.id,
            format: 'pdf',
          }),
        });
        if (!res.ok) throw new Error('export');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cv.pdf';
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const res = await fetch('/api/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'cover_letter',
            id: preview.id,
            template_id: 'cl-classic',
            format: 'pdf',
          }),
        });
        const json = (await res.json()) as { pdfUrl?: string; error?: string };
        if (!res.ok || !json.pdfUrl) throw new Error('export');
        window.open(json.pdfUrl, '_blank', 'noopener,noreferrer');
      }
    } catch {
      toast('Download failed', 'error');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`${title} — ${jobTitle} at ${company}`}
      className="max-h-[min(92vh,900px)] max-w-4xl overflow-hidden"
    >
      <div className="flex items-center justify-end gap-2 border-b border-[var(--color-border)] pb-3">
        <Link href={editHref}>
          <Button size="sm" variant="secondary" icon={<Pencil className="h-4 w-4" />}>
            Edit
          </Button>
        </Link>
        <Button
          size="sm"
          variant="primary"
          loading={downloading}
          onClick={() => void download()}
        >
          Download
        </Button>
        <button
          type="button"
          className="rounded-md p-2 text-[var(--color-muted)] transition hover:bg-[var(--color-hover-surface)] hover:text-[var(--color-text-primary)]"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="max-h-[min(78vh,760px)] overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-preview-well)]">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-[var(--color-primary-500)]" />
          </div>
        ) : (
          <iframe
            title="Preview"
            className="min-h-[480px] w-full bg-white"
            srcDoc={html}
          />
        )}
      </div>
    </Modal>
  );
}
