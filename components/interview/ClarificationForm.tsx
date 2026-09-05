'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { ClarificationQuestion } from '@/types/interview';

export function ClarificationForm({
  questions,
  initialAnswers,
  onSubmit,
  loading,
}: {
  questions: ClarificationQuestion[];
  initialAnswers?: Record<string, string>;
  onSubmit: (answers: Record<string, string>) => void;
  loading?: boolean;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers ?? {});

  return (
    <div className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-faint)]/50 p-4">
      <p className="text-sm font-semibold text-[var(--color-text-primary)]">
        Fill in missing details from your CV
      </p>
      <p className="text-xs text-[var(--color-muted)]">
        Type your own answers here — this is not the study Q&A with suggested answers. Required
        fields must be completed to unlock likely interview questions.
      </p>
      {questions.map((q) => (
        <div key={q.id} className="space-y-1">
          <p className="text-sm text-[var(--color-text-primary)]">{q.question}</p>
          {q.reason ? (
            <p className="text-xs text-[var(--color-muted)]">{q.reason}</p>
          ) : null}
          <Textarea
            rows={2}
            value={answers[q.id] ?? ''}
            onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
            placeholder={q.optional ? 'Optional' : 'Your answer'}
          />
        </div>
      ))}
      <Button
        variant="primary"
        loading={loading}
        onClick={() => onSubmit(answers)}
      >
        Continue preparation
      </Button>
    </div>
  );
}
