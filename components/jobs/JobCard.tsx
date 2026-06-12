'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FileText, Mail, MessageSquare, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Job } from '@/types/database';

interface JobCardProps {
  job: Job;
  onOpen: (job: Job) => void;
  isDragOverlay?: boolean;
}

function priorityDot(priority: string) {
  if (priority === 'high') return 'bg-red-500';
  if (priority === 'medium') return 'bg-amber-400';
  return null;
}

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function JobCard({ job, onOpen, isDragOverlay }: JobCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: job.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dot = priorityDot(job.priority);
  const appliedDate = formatDate(job.applied_at);
  const hasNotes = Boolean(job.notes?.trim());
  const hasCVs = (job.cvs?.length ?? 0) > 0;
  const hasCLs = (job.cover_letters?.length ?? 0) > 0;

  return (
    <div
      ref={setNodeRef}
      style={isDragOverlay ? undefined : style}
      className={cn(
        'group relative flex cursor-pointer flex-col gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-sm transition hover:border-[var(--color-border-hover)] hover:shadow-md',
        isDragging && 'opacity-30',
        isDragOverlay && 'shadow-xl opacity-95 rotate-1 scale-105'
      )}
      onClick={() => onOpen(job)}
      role="button"
      tabIndex={0}
      aria-label={`${job.company_name} — ${job.job_title}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(job);
        }
      }}
    >
      {/* Drag handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="absolute right-2 top-2 cursor-grab touch-none text-[var(--color-muted)] opacity-0 transition group-hover:opacity-100 active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-2 pr-6">
        {dot ? (
          <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', dot)} aria-hidden="true" />
        ) : null}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
            {job.company_name}
          </p>
          <p className="truncate text-xs text-[var(--color-muted)]">{job.job_title}</p>
        </div>
      </div>

      {(appliedDate || hasNotes || hasCVs || hasCLs) ? (
        <div className="flex items-center gap-2 text-[10px] text-[var(--color-muted)]">
          {appliedDate ? <span>Applied {appliedDate}</span> : null}
          <span className="ml-auto flex items-center gap-1.5">
            {hasNotes ? <MessageSquare className="h-3 w-3" aria-label="Has notes" /> : null}
            {hasCVs ? <FileText className="h-3 w-3 text-[var(--color-primary)]" aria-label="Linked CV" /> : null}
            {hasCLs ? <Mail className="h-3 w-3 text-[var(--color-primary)]" aria-label="Linked cover letter" /> : null}
          </span>
        </div>
      ) : null}
    </div>
  );
}
