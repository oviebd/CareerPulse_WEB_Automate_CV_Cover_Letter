'use client';

import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import type { CVData } from '@/types';
import { GripVertical } from 'lucide-react';

interface ExperienceCardProps {
  entry: CVData['experience'][number];
  onChange: (next: CVData['experience'][number]) => void;
}

function getBulletStrength(bullet: string): { tone: 'weak' | 'strong'; suggestion: string } {
  const normalized = bullet.toLowerCase();
  const hasMetric = /\d/.test(bullet);
  const startsWithVerb = /^(led|built|designed|implemented|optimized|developed|launched|improved|increased|reduced)\b/.test(
    normalized.trim()
  );
  if (startsWithVerb && hasMetric) {
    return { tone: 'strong', suggestion: 'Strong bullet with impact metric.' };
  }
  return {
    tone: 'weak',
    suggestion: "Use stronger action verb and measurable impact, e.g. 'Led a team of 5 engineers'.",
  };
}

export function ExperienceCard({ entry, onChange }: ExperienceCardProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const updateBullet = (idx: number, value: string) => {
    const next = [...entry.bullets];
    next[idx] = value;
    onChange({ ...entry, bullets: next });
  };

  const bulletIds = entry.bullets.map((_, idx) => `${entry.id}-bullet-${idx}`);

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = bulletIds.indexOf(String(active.id));
    const newIndex = bulletIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onChange({ ...entry, bullets: arrayMove(entry.bullets, oldIndex, newIndex) });
  };

  return (
    <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="mb-3 grid gap-2 sm:grid-cols-2">
        <input
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
          placeholder="Company name"
          value={entry.company}
          onChange={(e) => onChange({ ...entry, company: e.target.value })}
        />
        <input
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
          placeholder="Role + date"
          value={entry.title}
          onChange={(e) => onChange({ ...entry, title: e.target.value })}
        />
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={bulletIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
        {entry.bullets.map((bullet, i) => {
          const feedback = getBulletStrength(bullet);
          return (
            <SortableBullet
              key={`${entry.id}-${i}`}
              id={`${entry.id}-bullet-${i}`}
              tone={feedback.tone}
              suggestion={feedback.suggestion}
              value={bullet}
              onChange={(next) => updateBullet(i, next)}
              onEnter={() => {
                const next = [...entry.bullets];
                next.splice(i + 1, 0, '');
                onChange({ ...entry, bullets: next.slice(0, 8) });
              }}
              onTab={() => updateBullet(i, `  ${entry.bullets[i] ?? ''}`)}
            />
          );
        })}
      </div>
        </SortableContext>
      </DndContext>

      <div className="mt-3 flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onChange({ ...entry, bullets: [...entry.bullets, ''].slice(0, 8) })}
        >
          + Add bullet
        </Button>
      </div>
    </article>
  );
}

interface SortableBulletProps {
  id: string;
  value: string;
  tone: 'weak' | 'strong';
  suggestion: string;
  onChange: (value: string) => void;
  onEnter: () => void;
  onTab: () => void;
}

function SortableBullet({ id, value, tone, suggestion, onChange, onEnter, onTab }: SortableBulletProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-xl p-2 transition ${tone === 'strong' ? 'bg-emerald-50' : 'bg-amber-50'}`}
    >
      <div className="flex items-start gap-2">
        <button type="button" className="mt-2 cursor-grab text-slate-400 active:cursor-grabbing" {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4" />
        </button>
        <textarea
          className="min-h-[52px] flex-1 resize-y rounded-lg border border-transparent bg-white/80 px-3 py-2 text-sm outline-none focus:border-indigo-200"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onEnter();
            }
            if (e.key === 'Tab') {
              e.preventDefault();
              onTab();
            }
          }}
        />
      </div>
      <p className={`mt-1 text-xs ${tone === 'strong' ? 'text-emerald-700' : 'text-amber-700'}`}>
        {tone === 'weak' ? 'Warning:' : 'Great:'} {suggestion}
      </p>
    </div>
  );
}
