'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ExternalLink,
  FileText,
  Mail,
  Archive,
  Trash2,
  Plus,
  Calendar,
  MapPin,
  DollarSign,
  User,
  Link2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useUpsertJobApplication, useUpdateApplicationStatus } from '@/hooks/useTracker';
import type { Job } from '@/types/database';
import {
  KANBAN_COLUMN_CONFIG,
  KANBAN_COLUMNS,
  COLUMN_DB_STATUSES,
  jobStatusToColumn,
  type KanbanColumn,
} from '@/lib/job-status-ui';
import { LinkAssetModal } from './LinkAssetModal';

interface JobDetailDrawerProps {
  job: Job;
  onClose: () => void;
  onJobUpdate: (updated: Job) => void;
}

function formatDateDisplay(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function EditableField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-[var(--color-muted)]">
        {icon}
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? `Add ${label.toLowerCase()}…`}
        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition placeholder:text-[var(--color-muted)]/60 focus:border-[var(--color-primary-500)] focus:shadow-[0_0_0_3px_var(--color-focus-ring)]"
      />
    </div>
  );
}

export function JobDetailDrawer({ job, onClose, onJobUpdate }: JobDetailDrawerProps) {
  const { toast } = useToast();
  const upsert = useUpsertJobApplication();
  const updateStatus = useUpdateApplicationStatus();

  const [linkModalType, setLinkModalType] = useState<'cv' | 'cover_letter' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Local editable state — mirrors job fields
  const [companyName, setCompanyName] = useState(job.company_name);
  const [jobTitle, setJobTitle] = useState(job.job_title);
  const [jobUrl, setJobUrl] = useState(job.job_url ?? '');
  const [location, setLocation] = useState(job.location ?? '');
  const [salaryMin, setSalaryMin] = useState(job.salary_min?.toString() ?? '');
  const [salaryMax, setSalaryMax] = useState(job.salary_max?.toString() ?? '');
  const [contactName, setContactName] = useState(job.contact_name ?? '');
  const [contactEmail, setContactEmail] = useState(job.contact_email ?? '');
  const [notes, setNotes] = useState(job.notes ?? '');

  // Sync state when the job prop changes (e.g., from board optimistic update)
  useEffect(() => {
    setCompanyName(job.company_name);
    setJobTitle(job.job_title);
    setJobUrl(job.job_url ?? '');
    setLocation(job.location ?? '');
    setSalaryMin(job.salary_min?.toString() ?? '');
    setSalaryMax(job.salary_max?.toString() ?? '');
    setContactName(job.contact_name ?? '');
    setContactEmail(job.contact_email ?? '');
    setNotes(job.notes ?? '');
  }, [job.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced auto-save
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const save = useCallback(
    (patch: Partial<Job>) => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(async () => {
        try {
          await upsert.mutateAsync({ id: job.id, company_name: job.company_name, job_title: job.job_title, ...patch });
        } catch {
          toast('Failed to save changes.', 'error');
        }
      }, 600);
    },
    [job.id, job.company_name, job.job_title, upsert, toast]
  );

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Scroll lock
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const currentColumn = jobStatusToColumn(job.status);

  async function handleStatusChange(col: KanbanColumn) {
    const newStatus = COLUMN_DB_STATUSES[col][0];
    try {
      await updateStatus.mutateAsync({ id: job.id, status: newStatus });
      onJobUpdate({ ...job, status: newStatus });
    } catch {
      toast('Failed to update status.', 'error');
    }
  }

  async function handleArchive() {
    try {
      await updateStatus.mutateAsync({ id: job.id, status: 'archived' });
      onJobUpdate({ ...job, status: 'archived' });
      toast('Job archived.', 'success');
      onClose();
    } catch {
      toast('Failed to archive job.', 'error');
    }
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    try {
      const res = await fetch(`/api/jobs/${job.id}`, { method: 'DELETE' });
      const data = (await res.json()) as { deleted: boolean; reason?: string };
      if (data.deleted) {
        toast('Job deleted.', 'success');
      } else {
        toast('Job has linked documents — it was removed from the board.', 'info');
      }
      onClose();
    } catch {
      toast('Failed to delete job.', 'error');
    }
  }

  const cvs = job.cvs ?? [];
  const coverLetters = job.cover_letters ?? [];

  return (
    <AnimatePresence>
      <motion.div
        key="drawer-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
      />
      <motion.aside
        key="drawer-panel"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col overflow-y-auto border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl"
        aria-label="Job details"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
          <div className="min-w-0 flex-1">
            <input
              className="w-full truncate bg-transparent text-lg font-bold text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-muted)]"
              value={companyName}
              onChange={(e) => {
                setCompanyName(e.target.value);
                save({ company_name: e.target.value });
              }}
              placeholder="Company name"
              aria-label="Company name"
            />
            <input
              className="mt-0.5 w-full truncate bg-transparent text-sm text-[var(--color-muted)] outline-none placeholder:text-[var(--color-muted)]/60"
              value={jobTitle}
              onChange={(e) => {
                setJobTitle(e.target.value);
                save({ job_title: e.target.value });
              }}
              placeholder="Job title"
              aria-label="Job title"
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]"
            aria-label="Close drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 px-5 py-5">
          {/* Status pills */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
              Status
            </p>
            <div className="flex flex-wrap gap-1.5">
              {KANBAN_COLUMNS.map((col) => {
                const cfg = KANBAN_COLUMN_CONFIG[col];
                const isActive = currentColumn === col;
                return (
                  <button
                    key={col}
                    type="button"
                    onClick={() => void handleStatusChange(col)}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                      isActive
                        ? `${cfg.borderClass} bg-[var(--color-surface-2)]`
                        : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-border-hover)]'
                    }`}
                  >
                    {cfg.emoji} {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
              Details
            </p>
            <EditableField
              label="Job URL"
              value={jobUrl}
              type="url"
              icon={<Link2 className="h-3 w-3" />}
              onChange={(v) => { setJobUrl(v); save({ job_url: v || null }); }}
            />
            {jobUrl ? (
              <a
                href={jobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-[var(--color-primary)] underline underline-offset-4"
              >
                Open listing <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
            <EditableField
              label="Location"
              value={location}
              icon={<MapPin className="h-3 w-3" />}
              onChange={(v) => { setLocation(v); save({ location: v || null }); }}
            />
            <div className="grid grid-cols-2 gap-3">
              <EditableField
                label="Salary Min"
                value={salaryMin}
                type="number"
                icon={<DollarSign className="h-3 w-3" />}
                placeholder="e.g. 80000"
                onChange={(v) => { setSalaryMin(v); save({ salary_min: v ? Number(v) : null }); }}
              />
              <EditableField
                label="Salary Max"
                value={salaryMax}
                type="number"
                icon={<DollarSign className="h-3 w-3" />}
                placeholder="e.g. 120000"
                onChange={(v) => { setSalaryMax(v); save({ salary_max: v ? Number(v) : null }); }}
              />
            </div>
            <EditableField
              label="Recruiter / Contact"
              value={contactName}
              icon={<User className="h-3 w-3" />}
              onChange={(v) => { setContactName(v); save({ contact_name: v || null }); }}
            />
            <EditableField
              label="Contact Email"
              value={contactEmail}
              type="email"
              icon={<Mail className="h-3 w-3" />}
              onChange={(v) => { setContactEmail(v); save({ contact_email: v || null }); }}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
              Notes
            </label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => { setNotes(e.target.value); save({ notes: e.target.value || null }); }}
              placeholder="Add notes about this role…"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-muted)]/60 focus:border-[var(--color-primary-500)] focus:shadow-[0_0_0_3px_var(--color-focus-ring)]"
            />
          </div>

          {/* Timeline */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
              Timeline
            </p>
            <div className="space-y-1.5 text-sm">
              {[
                { label: 'Added', date: job.created_at },
                { label: 'Applied', date: job.applied_at },
                { label: 'Interview', date: job.interview_at },
                { label: 'Offer', date: job.offer_at },
              ].map(({ label, date }) =>
                date ? (
                  <div key={label} className="flex items-center gap-2 text-[var(--color-muted)]">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-xs font-medium">{label}:</span>
                    <span className="text-xs">{formatDateDisplay(date)}</span>
                  </div>
                ) : null
              )}
              {!job.applied_at && !job.interview_at && !job.offer_at ? (
                <p className="text-xs text-[var(--color-muted)]/60">No milestones yet.</p>
              ) : null}
            </div>
          </div>

          {/* Linked CVs */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
                <FileText className="mr-1 inline h-3.5 w-3.5" />
                Linked CVs
              </p>
              <button
                type="button"
                onClick={() => setLinkModalType('cv')}
                className="inline-flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline"
              >
                <Plus className="h-3 w-3" /> Link CV
              </button>
            </div>
            {cvs.length === 0 ? (
              <p className="text-xs text-[var(--color-muted)]/60">No CVs linked.</p>
            ) : (
              <ul className="space-y-1.5">
                {cvs.map((cv) => (
                  <li key={cv.id} className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-faint)] px-3 py-2 text-xs">
                    <span className="truncate font-medium">{cv.title ?? 'CV'}</span>
                    <Link
                      href={`/cv/edit/${cv.id}`}
                      className="shrink-0 text-[var(--color-primary)] hover:underline"
                    >
                      Edit
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Linked Cover Letters */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
                <Mail className="mr-1 inline h-3.5 w-3.5" />
                Linked Cover Letters
              </p>
              <button
                type="button"
                onClick={() => setLinkModalType('cover_letter')}
                className="inline-flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline"
              >
                <Plus className="h-3 w-3" /> Link Cover Letter
              </button>
            </div>
            {coverLetters.length === 0 ? (
              <p className="text-xs text-[var(--color-muted)]/60">No cover letters linked.</p>
            ) : (
              <ul className="space-y-1.5">
                {coverLetters.map((cl) => (
                  <li key={cl.id} className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-faint)] px-3 py-2 text-xs">
                    <span className="truncate font-medium">{cl.title ?? 'Cover letter'}</span>
                    <Link
                      href={`/cover-letters/${cl.id}`}
                      className="shrink-0 text-[var(--color-primary)] hover:underline"
                    >
                      View
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="sticky bottom-0 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
          <div className="flex items-center gap-2">
            {job.status !== 'archived' ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void handleArchive()}
                className="gap-1.5"
              >
                <Archive className="h-3.5 w-3.5" /> Archive
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void handleDelete()}
              className={`ml-auto gap-1.5 ${confirmDelete ? 'text-red-600' : 'text-[var(--color-muted)]'}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {confirmDelete ? 'Confirm delete' : 'Delete'}
            </Button>
          </div>
          {confirmDelete ? (
            <p className="mt-2 text-center text-xs text-[var(--color-muted)]">
              Click again to permanently delete.{' '}
              <button type="button" className="underline" onClick={() => setConfirmDelete(false)}>
                Cancel
              </button>
            </p>
          ) : null}
        </div>
      </motion.aside>

      {linkModalType ? (
        <LinkAssetModal
          jobId={job.id}
          type={linkModalType}
          isOpen
          onClose={() => setLinkModalType(null)}
        />
      ) : null}
    </AnimatePresence>
  );
}
