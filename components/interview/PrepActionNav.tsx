'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { BookOpen, ClipboardList, MessageSquare, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PrepTab } from '@/components/interview/prep-tabs';

type NavItem = {
  id: PrepTab;
  label: string;
  icon: typeof BookOpen;
  status: string;
  accent: string;
  iconBg: string;
};

type Props = {
  activeTab: PrepTab;
  onTabChange: (tab: PrepTab) => void;
  topicsDone: number;
  topicsTotal: number;
  questionCount: number;
  quizStatus: string;
  mockStatus: string;
};

export function PrepActionNav({
  activeTab,
  onTabChange,
  topicsDone,
  topicsTotal,
  questionCount,
  quizStatus,
  mockStatus,
}: Props) {
  const reduce = useReducedMotion();

  const items: NavItem[] = [
    {
      id: 'topics',
      label: 'Topics',
      icon: BookOpen,
      status: topicsTotal > 0 ? `${topicsDone}/${topicsTotal} done` : 'Not generated',
      accent: 'var(--color-primary-500)',
      iconBg: 'bg-[var(--color-primary-100)] text-[var(--color-primary)]',
    },
    {
      id: 'questions',
      label: 'Questions',
      icon: MessageSquare,
      status: questionCount > 0 ? `${questionCount} loaded` : 'Load questions',
      accent: 'var(--color-accent-mint)',
      iconBg: 'bg-[var(--color-accent-mint)]/15 text-[var(--color-accent-mint)]',
    },
    {
      id: 'quiz',
      label: 'Quiz',
      icon: ClipboardList,
      status: quizStatus,
      accent: 'var(--color-accent-gold)',
      iconBg: 'bg-[var(--color-accent-gold)]/15 text-[var(--color-accent-gold)]',
    },
    {
      id: 'mock',
      label: 'Mock interview',
      icon: Mic,
      status: mockStatus,
      accent: 'var(--color-primary-400)',
      iconBg: 'bg-[var(--color-primary-100)] text-[var(--color-primary-400)]',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4" role="tablist" aria-label="Interview prep sections">
      {items.map((item) => {
        const selected = activeTab === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onTabChange(item.id)}
            className={cn(
              'relative overflow-hidden rounded-card border p-3 text-left transition-all duration-200',
              'focus-visible:focus-ring',
              selected
                ? 'border-[var(--color-border-hover)] bg-[var(--color-primary-50)]/40 shadow-sm'
                : 'border-[var(--color-border)] bg-[var(--color-surface-faint)] hover:-translate-y-0.5 hover:border-[var(--color-border-hover)] hover:shadow-sm'
            )}
          >
            {selected && !reduce ? (
              <motion.span
                layoutId="prepActiveTab"
                className="absolute inset-0 -z-10 rounded-card border border-[var(--color-primary-200)] bg-[var(--color-primary-50)]/60"
                transition={{ duration: 0.2 }}
              />
            ) : null}
            <span
              className={cn(
                'mb-2 flex h-8 w-8 items-center justify-center rounded-xl',
                item.iconBg
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">{item.label}</p>
            <p className="mt-0.5 text-xs text-[var(--color-muted)]">{item.status}</p>
            <span
              className="absolute bottom-0 left-0 h-0.5 w-full origin-left scale-x-0 transition-transform duration-200"
              style={{
                background: item.accent,
                transform: selected ? 'scaleX(1)' : undefined,
              }}
              aria-hidden
            />
          </button>
        );
      })}
    </div>
  );
}
