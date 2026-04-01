'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { cn, generateId } from '@/lib/utils';
import {
  CV_INPUT,
  CV_NESTED_CARD,
  CV_SECTION_H2,
  CV_TEXTAREA,
} from '@/lib/cv-editor-styles';
import type { CVData, ExperienceEntry } from '@/types';
import { ExperienceCard } from '@/components/cv/premium/ExperienceCard';
import type { CVFormTab } from '@/components/cv/CVFormFields';

interface EditorProps {
  value: CVData;
  onChange: (value: CVData) => void;
  activeSection: CVFormTab;
}

const AI_ACTIONS = ['Improve this', 'Rewrite for ATS', 'Make it more impactful'];

function simulateAiRewrite(input: string, action: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (action === 'Rewrite for ATS') {
    return `Led cross-functional initiatives and delivered measurable outcomes: ${trimmed}`;
  }
  if (action === 'Make it more impactful') {
    return `${trimmed} Resulted in a 28% improvement in delivery speed and stakeholder satisfaction.`;
  }
  return `Enhanced: ${trimmed}`;
}

export function Editor({ value, onChange, activeSection }: EditorProps) {
  const [history, setHistory] = useState<CVData[]>([]);
  const [future, setFuture] = useState<CVData[]>([]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const update = (next: CVData) => {
    setHistory((prev) => [...prev.slice(-19), value]);
    setFuture([]);
    onChange(next);
  };

  const undo = () => {
    if (!history.length) return;
    const previous = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setFuture((f) => [value, ...f].slice(0, 20));
    onChange(previous);
  };

  const redo = () => {
    if (!future.length) return;
    const next = future[0];
    setFuture((f) => f.slice(1));
    setHistory((h) => [...h, value].slice(-20));
    onChange(next);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const sectionView = useMemo(() => {
    if (activeSection === 'summary') {
      return (
        <section className="space-y-3">
          <h2 className={CV_SECTION_H2}>Professional Summary</h2>
          <textarea
            className={cn(CV_TEXTAREA, 'min-h-[160px]')}
            placeholder="Write a concise, high-impact profile..."
            value={value.summary ?? ''}
            onChange={(e) => update({ ...value, summary: e.target.value })}
          />
          <div className="flex flex-wrap gap-2">
            {AI_ACTIONS.map((action) => (
              <Button
                key={action}
                variant="secondary"
                size="sm"
                onClick={() => update({ ...value, summary: simulateAiRewrite(value.summary ?? '', action) })}
              >
                {action}
              </Button>
            ))}
          </div>
        </section>
      );
    }

    if (activeSection === 'experience') {
      const entries = value.experience ?? [];
      const ids = entries.map((entry) => entry.id);
      const onDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIndex = ids.indexOf(String(active.id));
        const newIndex = ids.indexOf(String(over.id));
        if (oldIndex < 0 || newIndex < 0) return;
        update({ ...value, experience: arrayMove(entries, oldIndex, newIndex) });
      };
      return (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className={CV_SECTION_H2}>Experience</h2>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                update({
                  ...value,
                  experience: [
                    ...entries,
                    {
                      id: generateId(),
                      company: '',
                      title: '',
                      location: '',
                      start_date: '',
                      end_date: null,
                      is_current: false,
                      bullets: [''],
                      description: null,
                    } as ExperienceEntry,
                  ],
                })
              }
            >
              Add role
            </Button>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              {entries.map((entry, idx) => (
                <SortableExperience key={entry.id} id={entry.id}>
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                    <ExperienceCard
                      entry={entry}
                      onChange={(nextEntry) => {
                        const next = [...entries];
                        next[idx] = nextEntry;
                        update({ ...value, experience: next });
                      }}
                    />
                  </motion.div>
                </SortableExperience>
              ))}
            </SortableContext>
          </DndContext>
        </section>
      );
    }

    if (activeSection === 'skills') {
      const plainSkills = (value.skills ?? []).flatMap((s) => s.items).join(', ');
      return (
        <section className="space-y-3">
          <h2 className={CV_SECTION_H2}>Skills</h2>
          <textarea
            className={cn(CV_TEXTAREA, 'min-h-[140px]')}
            value={plainSkills}
            placeholder="React, TypeScript, Tailwind, Product Design..."
            onChange={(e) =>
              update({
                ...value,
                skills: [{ id: value.skills?.[0]?.id ?? generateId(), category: 'technical', items: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }],
              })
            }
          />
        </section>
      );
    }

    if (activeSection === 'education') {
      const rows = value.education ?? [];
      return (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className={CV_SECTION_H2}>Education</h2>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                update({
                  ...value,
                  education: [
                    ...rows,
                    {
                      id: generateId(),
                      institution: '',
                      degree: '',
                      field_of_study: '',
                      start_date: '',
                      end_date: null,
                      gpa: null,
                      description: null,
                    },
                  ],
                })
              }
            >
              Add education
            </Button>
          </div>
          {rows.map((row, idx) => (
            <div key={row.id} className={CV_NESTED_CARD}>
              <input className={cn(CV_INPUT, 'mb-2 w-full')} placeholder="Institution" value={row.institution} onChange={(e) => {
                const next = [...rows];
                next[idx] = { ...row, institution: e.target.value };
                update({ ...value, education: next });
              }} />
              <input className={cn(CV_INPUT, 'mb-2 w-full')} placeholder="Degree and field" value={`${row.degree ?? ''} ${row.field_of_study ?? ''}`.trim()} onChange={(e) => {
                const next = [...rows];
                next[idx] = { ...row, degree: e.target.value };
                update({ ...value, education: next });
              }} />
              <textarea className={cn(CV_TEXTAREA, 'min-h-[90px]')} placeholder="Key achievements or coursework" value={row.description ?? ''} onChange={(e) => {
                const next = [...rows];
                next[idx] = { ...row, description: e.target.value };
                update({ ...value, education: next });
              }} />
            </div>
          ))}
        </section>
      );
    }

    if (activeSection === 'projects') {
      const projects = value.projects ?? [];
      return (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className={CV_SECTION_H2}>Projects</h2>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                update({
                  ...value,
                  projects: [...projects, { id: generateId(), name: '', description: '', tech_stack: [], links: [], start_date: null, end_date: null }],
                })
              }
            >
              Add project
            </Button>
          </div>
          {projects.map((project, idx) => (
            <div key={project.id} className={CV_NESTED_CARD}>
              <input className={cn(CV_INPUT, 'mb-2 w-full font-medium')} placeholder="Project name" value={project.name} onChange={(e) => {
                const next = [...projects];
                next[idx] = { ...project, name: e.target.value };
                update({ ...value, projects: next });
              }} />
              <textarea className={cn(CV_TEXTAREA, 'min-h-[90px]')} placeholder="Impact-focused project description" value={project.description ?? ''} onChange={(e) => {
                const next = [...projects];
                next[idx] = { ...project, description: e.target.value };
                update({ ...value, projects: next });
              }} />
              <div className="mt-2 flex flex-wrap gap-2">
                {AI_ACTIONS.map((action) => (
                  <Button key={action} variant="ghost" size="sm" onClick={() => {
                    const next = [...projects];
                    next[idx] = { ...project, description: simulateAiRewrite(project.description ?? '', action) };
                    update({ ...value, projects: next });
                  }}>
                    {action}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </section>
      );
    }

    if (activeSection === 'languages') {
      const languages = value.languages ?? [];
      return (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className={CV_SECTION_H2}>Languages</h2>
            <Button variant="secondary" size="sm" onClick={() => update({ ...value, languages: [...languages, { id: generateId(), language: '', proficiency: 'fluent' }] })}>
              Add language
            </Button>
          </div>
          {languages.map((lang, idx) => (
            <div key={lang.id} className={CV_NESTED_CARD}>
              <input className={cn(CV_INPUT, 'mb-2 w-full')} placeholder="Language" value={lang.language} onChange={(e) => {
                const next = [...languages];
                next[idx] = { ...lang, language: e.target.value };
                update({ ...value, languages: next });
              }} />
              <input className={cn(CV_INPUT, 'w-full')} placeholder="Proficiency" value={lang.proficiency} onChange={(e) => {
                const next = [...languages];
                next[idx] = { ...lang, proficiency: (e.target.value as typeof lang.proficiency) || 'fluent' };
                update({ ...value, languages: next });
              }} />
            </div>
          ))}
        </section>
      );
    }

    if (activeSection === 'certifications') {
      const certs = value.certifications ?? [];
      return (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className={CV_SECTION_H2}>Certifications</h2>
            <Button variant="secondary" size="sm" onClick={() => update({ ...value, certifications: [...certs, { id: generateId(), name: '', issuer: '', issue_date: '', expiry_date: null, links: [] }] })}>
              Add certification
            </Button>
          </div>
          {certs.map((cert, idx) => (
            <div key={cert.id} className={CV_NESTED_CARD}>
              <input className={cn(CV_INPUT, 'mb-2 w-full')} placeholder="Certification name" value={cert.name} onChange={(e) => {
                const next = [...certs];
                next[idx] = { ...cert, name: e.target.value };
                update({ ...value, certifications: next });
              }} />
              <input className={cn(CV_INPUT, 'w-full')} placeholder="Issuer" value={cert.issuer ?? ''} onChange={(e) => {
                const next = [...certs];
                next[idx] = { ...cert, issuer: e.target.value };
                update({ ...value, certifications: next });
              }} />
            </div>
          ))}
        </section>
      );
    }

    if (activeSection === 'awards') {
      const awards = value.awards ?? [];
      return (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className={CV_SECTION_H2}>Awards</h2>
            <Button variant="secondary" size="sm" onClick={() => update({ ...value, awards: [...awards, { id: generateId(), title: '', issuer: '', date: '', description: '' }] })}>
              Add award
            </Button>
          </div>
          {awards.map((award, idx) => (
            <div key={award.id} className={CV_NESTED_CARD}>
              <input className={cn(CV_INPUT, 'mb-2 w-full')} placeholder="Award title" value={award.title} onChange={(e) => {
                const next = [...awards];
                next[idx] = { ...award, title: e.target.value };
                update({ ...value, awards: next });
              }} />
              <textarea className={cn(CV_TEXTAREA, 'min-h-[70px]')} placeholder="Describe why this matters" value={award.description ?? ''} onChange={(e) => {
                const next = [...awards];
                next[idx] = { ...award, description: e.target.value };
                update({ ...value, awards: next });
              }} />
            </div>
          ))}
        </section>
      );
    }

    return (
      <section className="rounded-card border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/50 p-6 text-sm text-[var(--color-muted)]">
        Section editor for <strong>{activeSection}</strong> is active. Inline blocks are implemented for summary, experience, and skills first, with the same card-based editing pattern ready to extend for the remaining sections.
      </section>
    );
  }, [activeSection, update, value]);

  return (
    <div className="space-y-3">
      <div className="glass-panel flex items-center justify-between rounded-card border border-[var(--color-border)] p-3">
        <p className="text-xs text-[var(--color-muted)]">Shortcuts: Cmd/Ctrl+Z (Undo), Cmd/Ctrl+Shift+Z (Redo)</p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" disabled={!history.length} onClick={undo}>
            Undo
          </Button>
          <Button variant="ghost" size="sm" disabled={!future.length} onClick={redo}>
            Redo
          </Button>
        </div>
      </div>
      {sectionView}
    </div>
  );
}

function SortableExperience({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className="relative">
      <div className="absolute -left-2 top-3 z-10">
        <button type="button" className="cursor-grab rounded-btn border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-1 text-xs text-[var(--color-muted)] shadow-sm active:cursor-grabbing" {...attributes} {...listeners}>
          drag
        </button>
      </div>
      {children}
    </div>
  );
}
