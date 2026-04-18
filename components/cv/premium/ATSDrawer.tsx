'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ATSReport } from '@/lib/cv-ats';
import { Progress } from '@/components/ui/progress';

interface ATSDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: ATSReport | null;
}

export function ATSDrawer({ open, onOpenChange, report }: ATSDrawerProps) {
  const [sectionsOpen, setSectionsOpen] = useState(true);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  const score = report?.score ?? 0;
  const suggestions = report?.suggestions ?? [];
  const summary = report?.summary ?? '';
  const sections = report?.sections ?? {};

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Close ATS panel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px]"
            onClick={() => onOpenChange(false)}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="ats-drawer-title"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            className={cn(
              'fixed right-0 top-0 z-[70] flex h-full w-full max-w-[380px] flex-col border-l border-[var(--color-border)]',
              'bg-[var(--color-surface)] shadow-2xl'
            )}
          >
            <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border)] px-4">
              <div className="min-w-0">
                <p id="ats-drawer-title" className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                  ATS insights
                </p>
                <p className="text-[11px] text-[var(--color-muted)]">Score, fixes, and section breakdown</p>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-white/[0.04] text-[var(--color-muted)] transition hover:bg-white/[0.08] hover:text-[var(--color-text-primary)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-input-bg)]/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-3xl font-bold tabular-nums text-[var(--color-text-primary)]">
                      {score}
                    </span>
                    <span className="text-sm font-medium text-[var(--color-muted)]">/ 100</span>
                  </div>
                  <span className="rounded-full border border-[var(--color-accent-mint)]/30 bg-[var(--color-accent-mint)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-accent-mint)]">
                    CV strength
                  </span>
                </div>
                <Progress value={score} className="mt-3 h-2 bg-white/[0.06]" />
              </div>

              {summary ? (
                <p className="mt-4 text-sm leading-relaxed text-[var(--color-text-primary)]">{summary}</p>
              ) : null}

              {suggestions.length > 0 ? (
                <div className="mt-5 space-y-2">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                    <Sparkles className="h-3.5 w-3.5 text-[var(--color-primary-400)]" />
                    Suggestions
                  </div>
                  <ul className="space-y-2 text-sm text-[var(--color-muted)]">
                    {suggestions.map((s, i) => (
                      <li
                        key={`${i}-${s.slice(0, 24)}`}
                        className="rounded-lg border border-[var(--color-border)]/60 bg-white/[0.03] px-3 py-2 leading-relaxed text-[var(--color-text-primary)]"
                      >
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="mt-5 text-sm text-[var(--color-muted)]">No open suggestions — nice work.</p>
              )}

              <button
                type="button"
                onClick={() => setSectionsOpen((v) => !v)}
                className="mt-6 flex w-full items-center justify-between rounded-xl border border-[var(--color-border)] bg-white/[0.03] px-3 py-2.5 text-left text-sm font-medium text-[var(--color-text-primary)] transition hover:bg-white/[0.06]"
              >
                Section scores
                {sectionsOpen ? (
                  <ChevronUp className="h-4 w-4 shrink-0 text-[var(--color-muted)]" />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 text-[var(--color-muted)]" />
                )}
              </button>

              {sectionsOpen ? (
                <ul className="mt-3 space-y-2">
                  {Object.entries(sections).map(([name, fb]) => (
                    <li
                      key={name}
                      className="rounded-xl border border-[var(--color-border)]/70 bg-white/[0.02] p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold capitalize text-[var(--color-text-primary)]">
                          {name}
                        </span>
                        <span className="font-mono text-xs text-[var(--color-muted)]">{fb.score}</span>
                      </div>
                      {fb.suggestions.length ? (
                        <ul className="mt-2 list-inside list-disc space-y-0.5 text-[11px] text-[var(--color-muted)]">
                          {fb.suggestions.slice(0, 3).map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
