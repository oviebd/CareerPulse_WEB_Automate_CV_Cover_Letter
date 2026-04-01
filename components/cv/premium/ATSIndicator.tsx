'use client';

import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';

interface ATSIndicatorProps {
  score: number;
  previousScore: number;
  /** Top suggestions from the ATS report (shown under the score bar). */
  suggestions?: string[];
  /** Omit outer card shell when nested inside another panel. */
  embedded?: boolean;
}

function getLabel(score: number): string {
  if (score >= 85) return 'Interview Ready';
  if (score >= 65) return 'Strong';
  return 'Beginner';
}

export function ATSIndicator({
  score,
  previousScore,
  suggestions = [],
  embedded = false,
}: ATSIndicatorProps) {
  const delta = score - previousScore;
  const topSuggestions = suggestions.slice(0, 5);

  const shell = embedded
    ? 'space-y-3'
    : 'glass-panel rounded-card border border-[var(--color-border)] p-4 shadow-sm backdrop-blur-sm';

  return (
    <div className={shell}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">ATS Score</p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-[var(--color-text-primary)]">
            {score}/100
          </p>
        </div>
        <span className="rounded-badge border border-[var(--color-border)] bg-white/[0.06] px-3 py-1 text-xs font-medium text-[var(--color-text-primary)]">
          {getLabel(score)}
        </span>
      </div>
      <Progress value={score} className="mt-3 h-2.5 bg-white/[0.08]" />
      {topSuggestions.length > 0 ? (
        <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            Suggestions
          </p>
          <ul className="mt-1.5 list-inside list-disc space-y-1 text-xs leading-relaxed text-[var(--color-muted)]">
            {topSuggestions.map((item, i) => (
              <li key={`${i}-${item.slice(0, 40)}`}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {delta > 0 ? (
        <motion.p
          key={score}
          initial={{ y: 4, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mt-2 text-xs font-medium text-[var(--color-accent-mint)]"
        >
          +{delta} ATS score — nice work
        </motion.p>
      ) : null}
    </div>
  );
}
