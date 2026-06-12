'use client';

import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useJobApplications, useUpdateApplicationStatus } from '@/hooks/useTracker';
import type { Job } from '@/types/database';
import {
  KANBAN_COLUMNS,
  COLUMN_DB_STATUSES,
  columnToDefaultStatus,
  jobStatusToColumn,
  type KanbanColumn,
} from '@/lib/job-status-ui';
import { KanbanColumn as KanbanColumnComponent } from './KanbanColumn';
import { JobCard } from './JobCard';
import { AddJobModal } from './AddJobModal';
import { JobDetailDrawer } from './JobDetailDrawer';

function groupByColumn(jobs: Job[]): Record<KanbanColumn, Job[]> {
  const groups = Object.fromEntries(
    KANBAN_COLUMNS.map((c) => [c, [] as Job[]])
  ) as Record<KanbanColumn, Job[]>;

  for (const job of jobs) {
    const col = jobStatusToColumn(job.status);
    if (col) groups[col].push(job);
  }
  return groups;
}

export function KanbanBoard() {
  const { data: jobs = [], isLoading } = useJobApplications();
  const updateStatus = useUpdateApplicationStatus();

  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [drawerJob, setDrawerJob] = useState<Job | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addModalColumn, setAddModalColumn] = useState<KanbanColumn>('wishlist');

  const grouped = useMemo(() => groupByColumn(jobs), [jobs]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragStart(event: DragStartEvent) {
    const job = jobs.find((j) => j.id === event.active.id);
    setActiveJob(job ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveJob(null);
    const { active, over } = event;
    if (!over) return;

    const jobId = active.id as string;
    const overId = over.id as string;

    // Determine destination column
    let destCol: KanbanColumn | null = null;
    if (KANBAN_COLUMNS.includes(overId as KanbanColumn)) {
      destCol = overId as KanbanColumn;
    } else {
      // Dropped over a card — find that card's column
      const targetJob = jobs.find((j) => j.id === overId);
      if (targetJob) {
        destCol = jobStatusToColumn(targetJob.status);
      }
    }

    if (!destCol) return;

    const movingJob = jobs.find((j) => j.id === jobId);
    if (!movingJob) return;

    const currentCol = jobStatusToColumn(movingJob.status);
    if (currentCol === destCol) return; // no column change

    const newStatus = columnToDefaultStatus(destCol);
    updateStatus.mutate({ id: jobId, status: newStatus });
  }

  function handleAddJobToColumn(column: KanbanColumn) {
    setAddModalColumn(column);
    setAddModalOpen(true);
  }

  function handleCardOpen(job: Job) {
    setDrawerJob(job);
  }

  function handleDrawerJobUpdate(updated: Job) {
    if (drawerJob?.id === updated.id) {
      setDrawerJob(updated);
    }
  }

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map((col) => (
          <Skeleton key={col} className="h-64 min-w-[220px] rounded-xl" />
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-faint)]/50 px-6 py-16 text-center">
        <p className="text-4xl">📋</p>
        <p className="mt-4 font-semibold text-[var(--color-text-primary)]">
          No jobs tracked yet
        </p>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Add a job to start tracking your applications.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button variant="primary" onClick={() => setAddModalOpen(true)}>
            + Track a Job
          </Button>
          <Link href="/applications/new">
            <Button variant="secondary">Generate Tailored CV &amp; CL</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
            {KANBAN_COLUMNS.map((col) => (
              <KanbanColumnComponent
                key={col}
                column={col}
                jobs={grouped[col]}
                onCardOpen={handleCardOpen}
                onAddJob={handleAddJobToColumn}
              />
            ))}
          </div>
        </div>

        <DragOverlay dropAnimation={{ duration: 150, easing: 'ease-out' }}>
          {activeJob ? (
            <JobCard job={activeJob} onOpen={() => {}} isDragOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>

      <AddJobModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        initialColumn={addModalColumn}
      />

      {drawerJob ? (
        <JobDetailDrawer
          job={drawerJob}
          onClose={() => setDrawerJob(null)}
          onJobUpdate={handleDrawerJobUpdate}
        />
      ) : null}
    </>
  );
}
