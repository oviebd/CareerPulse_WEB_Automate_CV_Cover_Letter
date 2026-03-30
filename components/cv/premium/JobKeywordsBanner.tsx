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

/** Prominent display of role keywords with live match state (green = found in CV). */
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

  const outer =
    embedded
      ? 'space-y-3'
      : 'rounded-2xl border border-sky-200/80 bg-gradient-to-br from-sky-50/90 via-white to-indigo-50/40 p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5';

  return (
    <div className={outer}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 shadow-sm">
          <Tag className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Highlighted keywords</p>
            <p className="text-xs text-slate-500" aria-live="polite">
              <span className="font-medium text-emerald-700">{foundCount}</span> of {keywords.length} in your CV
            </p>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Green chips mean that phrase appears somewhere in your CV. Gray means it is not detected yet—add it where it
            fits.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="keyword list">
            {rows.map(({ kw, i, present }) => (
              <li key={`${i}-${kw}`}>
                <span
                  className={
                    present
                      ? 'inline-flex items-center rounded-full border border-emerald-300/90 bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-950 shadow-sm ring-1 ring-emerald-200/80'
                      : 'inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-200/60'
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
