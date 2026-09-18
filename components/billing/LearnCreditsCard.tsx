'use client';

import { Card } from '@/components/ui/card';
import { formatCredits } from '@/lib/credits/calculator';
import {
  CREDIT_OPERATION_ESTIMATES,
  JOB_SPECIFIC_CV_RESERVATION_NOTE_CREDITS,
} from '@/lib/credits/operation-estimates';

export function LearnCreditsCard() {
  return (
    <Card>
      <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
        Learn credits
      </h2>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        Actual usage varies by document length and AI output. These are typical amounts per action.
      </p>
      <ul className="mt-4 space-y-3">
        {CREDIT_OPERATION_ESTIMATES.map((op) => (
          <li
            key={op.id}
            className="flex flex-col gap-1 rounded-lg border border-[var(--color-border)] p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <div className="font-medium text-[var(--color-text-primary)]">{op.label}</div>
              {op.detail ? (
                <div className="text-xs text-[var(--color-muted)]">{op.detail}</div>
              ) : null}
            </div>
            <div className="shrink-0 text-sm font-semibold text-[var(--color-text-primary)] sm:text-right">
              ~{formatCredits(op.typicalCredits)} credits
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-[var(--color-muted)]">
        Starting a job-specific CV may temporarily require about{' '}
        {formatCredits(JOB_SPECIFIC_CV_RESERVATION_NOTE_CREDITS)} credits in your wallet (reservation).
        You are only charged for actual usage; any unused hold is released.
      </p>
    </Card>
  );
}
