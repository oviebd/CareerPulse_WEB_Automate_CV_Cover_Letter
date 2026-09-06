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
    <div className="flex min-w-0 w-full flex-col">
      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-[10rem] flex-1 flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm transition-all duration-150',
          isOver && cfg.dropHighlight
        )}
      >
        {/* Status accent stripe */}
        <div className={cn('h-0.5 w-full shrink-0', cfg.bgColor)} aria-hidden="true" />

        {/* Column header */}
        <div className="flex items-center justify-between gap-1 border-b border-[var(--color-border)] px-2 py-2">
          <div className="flex min-w-0 items-center gap-1">
            <span className="shrink-0 text-xs">{cfg.emoji}</span>
            <h3
              className={cn(
                'truncate text-[10px] font-semibold uppercase tracking-wide',
                cfg.textColor
              )}
            >
              {cfg.label}
            </h3>
            <span className="shrink-0 rounded-full bg-[var(--color-surface-2)] px-1 py-0.5 text-[9px] font-medium text-[var(--color-icon-muted)]">
              {jobs.length}
            </span>
          </div>
          {column !== 'archived' ? (
            <button
              type="button"
              onClick={() => onAddJob(column)}
              className="shrink-0 rounded p-0.5 text-[var(--color-icon)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]"
              aria-label={`Add job to ${cfg.label}`}
            >
              <Plus className="h-3 w-3" />
            </button>
          ) : null}
        </div>

        {/* Cards area */}
        <div className="flex flex-1 flex-col gap-2 p-2">
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
                  className="min-w-0"
                >
                  <JobCard job={job} onOpen={onCardOpen} />
                </motion.div>
              ))}
            </AnimatePresence>
          </SortableContext>

          {jobs.length === 0 ? (
            <div className="flex flex-1 items-center justify-center py-6">
              <p className="text-center text-[10px] text-[var(--color-muted)]">Drop here</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
