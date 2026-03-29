'use client';

import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useState } from 'react';
import type { ApplicationStatus, JobApplication, WorkType } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  useJobApplications,
  useUpdateApplicationStatus,
  useUpsertJobApplication,
} from '@/hooks/useTracker';
import { formatDate } from '@/lib/utils';

const COLUMNS: { id: ApplicationStatus; label: string }[] = [
  { id: 'saved', label: 'Saved' },
  { id: 'applied', label: 'Applied' },
  { id: 'phone_screen', label: 'Phone' },
  { id: 'interview', label: 'Interview' },
  { id: 'technical', label: 'Technical' },
  { id: 'final_round', label: 'Final' },
  { id: 'offer', label: 'Offer' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'withdrawn', label: 'Withdrawn' },
];

function Column({
  status,
  count,
  children,
}: {
  status: ApplicationStatus;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const col = COLUMNS.find((c) => c.id === status);
  return (
    <div
      ref={setNodeRef}
      className={`flex w-64 shrink-0 flex-col rounded-xl border bg-slate-50 p-2 ${
        isOver ? 'border-[var(--color-primary)] ring-2 ring-blue-200' : 'border-[var(--color-border)]'
      }`}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
          {col?.label}
        </span>
        <Badge variant="default">{count}</Badge>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">{children}</div>
    </div>
  );
}

function AppCard({ app }: { app: JobApplication }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: app.id,
    data: { status: app.status },
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)`, opacity: isDragging ? 0.5 : 1 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="cursor-grab rounded-lg border border-[var(--color-border)] bg-white p-3 text-sm shadow-sm active:cursor-grabbing"
    >
      <div className="font-semibold">{app.company_name}</div>
      <div className="text-xs text-[var(--color-muted)]">{app.job_title}</div>
      {app.work_type ? (
        <Badge variant="info" className="mt-1 capitalize">
          {app.work_type}
        </Badge>
      ) : null}
      {app.applied_at ? (
        <div className="mt-1 text-[10px] text-[var(--color-muted)]">
          Applied {formatDate(app.applied_at)}
        </div>
      ) : null}
    </div>
  );
}

export function TrackerBoard() {
  const { data: apps = [] } = useJobApplications();
  const updateStatus = useUpdateApplicationStatus();
  const createApp = useUpsertJobApplication();
  const [selected, setSelected] = useState<JobApplication | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function onDragEnd(e: DragEndEvent) {
    const overId = e.over?.id as ApplicationStatus | undefined;
    const activeId = e.active.id as string;
    if (!overId || !activeId) return;
    updateStatus.mutate({ id: activeId, status: overId });
  }

  const total = apps.filter((a) => !['rejected', 'withdrawn'].includes(a.status)).length;
  const thisWeek = apps.filter((a) => {
    const t = new Date(a.updated_at).getTime();
    return Date.now() - t < 7 * 86400000;
  }).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 text-sm text-[var(--color-muted)]">
        <span>
          Active: <strong className="text-[var(--color-secondary)]">{total}</strong>
        </span>
        <span>
          Updated this week:{' '}
          <strong className="text-[var(--color-secondary)]">{thisWeek}</strong>
        </span>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="primary"
          onClick={() =>
            createApp.mutate({
              company_name: 'New company',
              job_title: 'Role title',
              status: 'saved',
            })
          }
        >
          Add (Saved)
        </Button>
      </div>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {COLUMNS.map((col) => {
            const list = apps.filter((a) => a.status === col.id);
            return (
              <Column key={col.id} status={col.id} count={list.length}>
                {list.map((app) => (
                  <div
                    key={app.id}
                    role="presentation"
                    onClick={() => setSelected(app)}
                  >
                    <AppCard app={app} />
                  </div>
                ))}
              </Column>
            );
          })}
        </div>
      </DndContext>
      <ApplicationDrawer app={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

export function ApplicationDrawer({
  app,
  onClose,
}: {
  app: JobApplication | null;
  onClose: () => void;
}) {
  const upsert = useUpsertJobApplication();
  if (!app) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xl">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold">Application</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
      <div className="mt-4 space-y-3">
        <Input
          label="Company"
          defaultValue={app.company_name}
          onBlur={(e) =>
            upsert.mutate({ ...app, company_name: e.target.value })
          }
        />
        <Input
          label="Job title"
          defaultValue={app.job_title}
          onBlur={(e) => upsert.mutate({ ...app, job_title: e.target.value })}
        />
        <Input
          label="Job URL"
          defaultValue={app.job_url ?? ''}
          onBlur={(e) => upsert.mutate({ ...app, job_url: e.target.value || null })}
        />
        <Textarea
          label="Notes"
          defaultValue={app.notes ?? ''}
          onBlur={(e) => upsert.mutate({ ...app, notes: e.target.value || null })}
        />
        <label className="text-sm">
          Work type
          <select
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] p-2 text-sm"
            defaultValue={app.work_type ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              upsert.mutate({
                ...app,
                work_type: v === '' ? null : (v as WorkType),
              });
            }}
          >
            <option value="">—</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">Onsite</option>
          </select>
        </label>
      </div>
    </div>
  );
}
