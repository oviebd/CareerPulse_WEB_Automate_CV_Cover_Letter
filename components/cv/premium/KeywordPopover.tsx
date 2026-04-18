'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import type { CVData } from '@/types';
import { cn } from '@/lib/utils';
import { JobKeywordsBanner } from '@/components/cv/premium/JobKeywordsBanner';

interface KeywordPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  keywords: string[];
  cv: CVData | null;
  /** Raw job description or comma-separated fallback — same content as legacy expandable panel. */
  jobDescriptionText?: string | null;
}

export function KeywordPopover({
  open,
  onOpenChange,
  keywords,
  cv,
  jobDescriptionText,
}: KeywordPopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [jdOpen, setJdOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const el = panelRef.current;
      const target = e.target as Node | null;
      if (el && target && !el.contains(target)) {
        const t = e.target as HTMLElement | null;
        if (t?.closest?.('[data-keyword-popover-trigger="true"]')) return;
        onOpenChange(false);
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
    };
  }, [open, onOpenChange]);

  const jdBody =
    jobDescriptionText?.trim() ||
    (keywords.length ? keywords.join(', ') : '') ||
    null;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
          className={cn(
            'fixed right-4 top-[calc(64px+env(safe-area-inset-top))] z-[55] w-[min(calc(100vw-2rem),420px)]',
            'max-h-[min(72vh,560px)] overflow-hidden rounded-2xl border border-[var(--color-border)]',
            'bg-[var(--color-surface)] shadow-2xl ring-1 ring-black/5'
          )}
        >
          <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">Role keywords</p>
              <p className="text-[11px] text-[var(--color-muted)]">Matches update as you edit</p>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-control-bg)] text-[var(--color-muted)] transition duration-200 hover:bg-[var(--color-control-bg-hover)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-[min(62vh,480px)] overflow-y-auto overscroll-contain px-4 py-4">
            {keywords.length > 0 && cv ? (
              <JobKeywordsBanner keywords={keywords} cv={cv} embedded />
            ) : (
              <p className="text-sm text-[var(--color-muted)]">
                No keywords stored for this role yet. Save from optimise flow or paste keywords into your workflow when
                available.
              </p>
            )}

            <div className="mt-5 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)]/40">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-medium text-[var(--color-text-primary)]"
                onClick={() => setJdOpen((v) => !v)}
                aria-expanded={jdOpen}
              >
                <span>Job description / stored text</span>
                {jdOpen ? (
                  <ChevronUp className="h-4 w-4 shrink-0 text-[var(--color-muted)]" />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 text-[var(--color-muted)]" />
                )}
              </button>
              {jdOpen ? (
                <div className="border-t border-[var(--color-border)] px-3 pb-3 pt-2">
                  <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] p-3 font-mono text-[11px] leading-relaxed text-[var(--color-text-primary)]">
                    {jdBody ?? 'No job description stored.'}
                  </pre>
                </div>
              ) : null}
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
