'use client';

import { AlertTriangle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { JobAnalysisResult } from '@/types';

type InsightPanelProps = {
  state: 'loading' | 'done' | 'error';
  analysis: JobAnalysisResult | null;
  errorMessage: string | null;
  onRetry: () => void;
};

export function InsightPanel({ state, analysis, errorMessage, onRetry }: InsightPanelProps) {
  if (state === 'loading') {
    return (
      <aside className="w-full max-w-[360px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
          <Loader2 className="h-4 w-4 animate-spin text-[var(--color-primary)]" />
          Analyzing role fit...
        </div>
        <div className="space-y-3">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </aside>
    );
  }

  if (state === 'error') {
    return (
      <aside className="w-full max-w-[360px] rounded-2xl border border-red-200 bg-red-50/80 p-6 text-sm text-red-900 shadow-sm">
        <p className="font-semibold">Could not analyze this job</p>
        <p className="mt-1">{errorMessage ?? 'Please try again.'}</p>
        <Button className="mt-4" variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      </aside>
    );
  }

  if (!analysis) return null;

  return (
    <aside className="w-full max-w-[380px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
      <div className="border-b border-[var(--color-border)] pb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">Insights</p>
        <p className="mt-1 text-base font-semibold text-[var(--color-text-primary)]">
          {[analysis.jobTitle, analysis.company].filter(Boolean).join(' at ') || 'Role analysis'}
        </p>
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">Match score</p>
        <div className="mt-2 flex items-center gap-3">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200/90 dark:bg-slate-600/50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-fuchsia-500 transition-all"
              style={{ width: `${analysis.matchPercentage}%` }}
            />
          </div>
          <span className="text-xl font-bold text-[var(--color-text-primary)]">{analysis.matchPercentage}%</span>
        </div>
      </div>

      {analysis.keywords.length > 0 ? (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">Keyword gaps</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {analysis.keywords.map((keyword) => (
              <Badge key={keyword} variant="default" className="font-normal">
                {keyword}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      {analysis.keyRequirements.length > 0 ? (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">Suggestions</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {analysis.keyRequirements.slice(0, 8).map((item) => (
              <span
                key={item}
                className="rounded-full border border-[var(--color-border)] bg-[var(--color-input-bg)] px-2.5 py-1 text-xs text-[var(--color-text-primary)]"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">Tone insights</p>
        <div className="mt-2 space-y-2">
          {analysis.whyGoodFit.slice(0, 2).map((line) => (
            <p key={line} className="text-sm text-[var(--color-text-primary)]">
              {line}
            </p>
          ))}
          {analysis.whyNotGoodFit.slice(0, 2).map((line) => (
            <p key={line} className="flex items-start gap-1.5 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {line}
            </p>
          ))}
        </div>
      </div>
    </aside>
  );
}
