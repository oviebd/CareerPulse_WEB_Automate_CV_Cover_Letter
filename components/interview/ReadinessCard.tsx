'use client';

import { Progress } from '@/components/ui/progress';
import type { ReadinessBreakdown } from '@/types/interview';

export function ReadinessCard({ readiness }: { readiness: ReadinessBreakdown }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-[var(--color-text-secondary)]">Interview progress</p>
        <p className="font-display text-4xl font-bold text-[var(--color-text-primary)]">
          {readiness.overall}%
        </p>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          Based on topic completion, quiz participation, and mock interview participation.
        </p>
      </div>
      <Progress value={readiness.overall} className="h-2" />
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-[var(--color-text-secondary)]">
            Topics ({readiness.topics_done}/{readiness.topics_total})
          </span>
          <span className="font-semibold text-[var(--color-text-primary)]">
            {readiness.topic_points}%
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[var(--color-text-secondary)]">Quiz completed</span>
          <span className="font-semibold text-[var(--color-text-primary)]">
            {readiness.quiz_completed ? `${readiness.quiz_points}%` : '0%'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[var(--color-text-secondary)]">Mock interview completed</span>
          <span className="font-semibold text-[var(--color-text-primary)]">
            {readiness.mock_completed ? `${readiness.mock_points}%` : '0%'}
          </span>
        </div>
      </div>
    </div>
  );
}
