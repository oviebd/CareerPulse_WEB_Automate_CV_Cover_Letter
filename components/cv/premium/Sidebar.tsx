'use client';

import { cn } from '@/lib/utils';
import type { ComponentType } from 'react';
import type { CVFormTab } from '@/components/cv/CVFormFields';
import {
  Award,
  BriefcaseBusiness,
  FileBadge2,
  GraduationCap,
  IdCard,
  Languages,
  Lightbulb,
  Sparkles,
  UserRound,
  Users,
  Wrench,
} from 'lucide-react';

const ITEMS: Array<{ id: CVFormTab; label: string; icon: ComponentType<{ className?: string }> }> = [
  { id: 'header', label: 'Header & contact', icon: IdCard },
  { id: 'summary', label: 'Summary', icon: UserRound },
  { id: 'experience', label: 'Experience', icon: BriefcaseBusiness },
  { id: 'education', label: 'Education', icon: GraduationCap },
  { id: 'skills', label: 'Skills', icon: Wrench },
  { id: 'projects', label: 'Projects', icon: Lightbulb },
  { id: 'languages', label: 'Languages', icon: Languages },
  { id: 'certifications', label: 'Certifications', icon: FileBadge2 },
  { id: 'references', label: 'References', icon: Users },
  { id: 'awards', label: 'Awards', icon: Award },
];

interface SidebarProps {
  activeSection: CVFormTab;
  onSelect: (section: CVFormTab) => void;
}

export function Sidebar({ activeSection, onSelect }: SidebarProps) {
  return (
    <aside className="glass-panel w-full rounded-card border border-[var(--color-border)] p-3 shadow-sm xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:w-64 xl:overflow-y-auto">
      <div className="mb-4 flex items-center gap-2 px-2 py-3">
        <span className="rounded-lg bg-[var(--color-primary-100)] p-1.5 text-[var(--color-primary-400)]">
          <Sparkles className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">CV Builder Pro</p>
          <p className="text-xs text-[var(--color-muted)]">Editor-first workflow</p>
        </div>
      </div>

      <nav className="space-y-1">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.id === activeSection;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={cn(
                'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition duration-200',
                active
                  ? 'bg-[var(--color-primary-100)] font-medium text-[var(--color-primary-400)]'
                  : 'text-[var(--color-muted)] hover:bg-white/[0.04] hover:text-[var(--color-text-primary)]'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
