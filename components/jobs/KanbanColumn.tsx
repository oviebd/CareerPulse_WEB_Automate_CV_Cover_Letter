'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Job } from '@/types/database';
import type { KanbanColumn as KanbanColumnType } from '@/lib/job-status-ui';
import { KANBAN_COLUMN_CONFIG } from '@/lib/job-status-ui';
import { JobCard } from './JobCard';

interface KanbanColumnProps {
  column: KanbanColumnType;
  jobs: Job[];
  onCardOpen: (job: Job) => void;
  onAddJob: (column: KanbanColumnType) => void;
}

export function KanbanColumn({ column, jobs, onCardOpen, onAddJob }: KanbanColumnProps) {
  const cfg = KANBAN_COLUMN_CONFIG[column];
  const { setNodeRef, isOver } = useDroppable({ id: column });
  const jobIds = jobs.map((j) => j.id);

  return (
    <div className="flex min-w-[220px] max-w-[280px] shrink-0 flex-col">
      {/* Column header */}
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{cfg.emoji}</span>
          <h3 className={cn('text-xs font-semibold uppercase tracking-wide', cfg.textColor)}>
            {cfg.label}
          </h3>
          <span className="rounded-full bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-muted)]">
            {jobs.length}
          </span>
        </div>
        {column !== 'archived' ? (
          <button
            type="button"
            onClick={() => onAddJob(column)}
            className="rounded p-0.5 text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]"
            aria-label={`Add job to ${cfg.label}`}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {/* Droppable area */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-[8rem] flex-1 flex-col gap-2 rounded-xl border border-[var(--color-border)]/40 bg-[var(--color-surface-faint)]/60 p-2 transition-all duration-150',
          isOver && cfg.dropHighlight
        )}
      >
        <SortableContext items={jobIds} strategy={verticalListSortingStrategy}>
          <AnimatePresence initial={false}>
            {jobs.map((job) => (
              <motion.div
                key={job.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
              >
                <JobCard job={job} onOpen={onCardOpen} />
              </motion.div>
            ))}
          </AnimatePresence>
        </SortableContext>

        {jobs.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-4">
            <p className="text-center text-[11px] text-[var(--color-muted)]/60">
              Drop here
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
