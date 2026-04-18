'use client';

import { useMemo } from 'react';
import { Tag } from 'lucide-react';
import type { CVData } from '@/types';
import { isKeywordPresentInCv } from '@/lib/cv-keyword-presence';

interface JobKeywordsBannerProps {
  keywords: string[];
  /** Current CV content; chips update as this changes. */
  cv: CVData;
  /** Omit outer gradient card when nested inside another panel. */
  embedded?: boolean;
}

/** Prominent display of role keywords with live match state (mint = found in CV). */
export function JobKeywordsBanner({ keywords, cv, embedded = false }: JobKeywordsBannerProps) {
  const rows = useMemo(
    () =>
      keywords.map((kw, i) => ({
        kw,
        i,
        present: isKeywordPresentInCv(kw, cv),
      })),
    [keywords, cv]
  );

  const foundCount = useMemo(() => rows.filter((r) => r.present).length, [rows]);

  if (!keywords.length) return null;

  const outer = embedded
    ? 'space-y-3'
    : 'glass-panel rounded-card border border-[var(--color-border)] p-4 shadow-sm sm:p-5';

  return (
    <div className={outer}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--color-primary-200)]/40 bg-[var(--color-primary-100)]/30 text-[var(--color-primary-400)]">
          <Tag className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
              Highlighted keywords
            </p>
            <p className="font-mono text-xs text-[var(--color-muted)]" aria-live="polite">
              <span className="font-medium text-[var(--color-accent-mint)]">{foundCount}</span> of{' '}
              {keywords.length} in your CV
            </p>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted)]">
            Mint chips mean that phrase appears somewhere in your CV. Muted chips mean it is not detected yet—add it
            where it fits.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="keyword list">
            {rows.map(({ kw, i, present }) => (
              <li key={`${i}-${kw}`}>
                <span
                  className={
                    present
                      ? 'inline-flex items-center rounded-badge border border-[var(--color-accent-mint)]/40 bg-[var(--color-accent-mint)]/15 px-3 py-1.5 text-xs font-medium text-[var(--color-accent-mint)]'
                      : 'inline-flex items-center rounded-badge border border-[var(--color-border)] bg-[var(--color-control-bg)] px-3 py-1.5 text-xs font-medium text-[var(--color-muted)]'
                  }
                  title={present ? 'Found in your CV' : 'Not found in your CV yet'}
                >
                  {kw}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
