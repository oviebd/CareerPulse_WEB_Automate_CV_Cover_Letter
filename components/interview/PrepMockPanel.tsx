'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Mic } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStartInterviewSession } from '@/hooks/useInterview';

type Props = {
  profileId: string;
  isReady: boolean;
  sessions: Record<string, unknown>[];
  blueprint: {
    interview_strategy?: {
      duration_minutes?: number;
      question_count?: number;
      difficulty?: string;
    };
  } | null;
};

export function PrepMockPanel({ profileId, isReady, sessions, blueprint }: Props) {
  const router = useRouter();
  const start = useStartInterviewSession();
  const [mode, setMode] = useState<'practice' | 'realistic'>('practice');

  async function handleStart() {
    const result = await start.mutateAsync({
      profile_id: profileId,
      type: 'mock',
      mode,
      difficulty: blueprint?.interview_strategy?.difficulty ?? 'job_level',
    });
    router.push(`/interview/${profileId}/session/${result.session.id}`);
  }

  if (!isReady) {
    return (
      <Card className="py-8 text-center text-sm text-[var(--color-muted)]">
        Complete interview analysis before starting a mock interview.
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Mock interview</h3>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          AI interviewer ready when you are
        </p>
      </div>

      <Card className="space-y-4 border-[var(--color-primary-200)]/40 bg-gradient-to-br from-[var(--color-primary-50)]/40 to-transparent">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-100)] text-[var(--color-primary)]">
            <Mic className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
              ~{blueprint?.interview_strategy?.duration_minutes ?? 30} min ·{' '}
              ~{blueprint?.interview_strategy?.question_count ?? 10} questions
            </p>
            <p className="text-xs text-[var(--color-muted)]">Choose your interview style</p>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            Mode
          </p>
          <div className="mt-2 flex gap-2">
            {(['practice', 'realistic'] as const).map((m) => (
              <Button
                key={m}
                size="sm"
                variant={mode === m ? 'primary' : 'secondary'}
                onClick={() => setMode(m)}
              >
                {m === 'practice' ? 'Practice' : 'Realistic'}
              </Button>
            ))}
          </div>
          <p className="mt-2 text-xs text-[var(--color-muted)]">
            {mode === 'practice'
              ? 'Get feedback after each answer.'
              : 'Feedback only at the end.'}
          </p>
        </div>

        <Button
          variant="primary"
          className="w-full"
          loading={start.isPending}
          onClick={() => void handleStart()}
        >
          Start mock interview
        </Button>
      </Card>

      {sessions.length > 0 ? (
        <Card>
          <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Interview history
          </h4>
          <ul className="mt-3 divide-y divide-[var(--color-border)]">
            {sessions.map((s) => (
              <li
                key={s.id as string}
                className="flex items-center justify-between gap-3 py-2.5 text-sm first:pt-0 last:pb-0"
              >
                <span className="capitalize text-[var(--color-text-secondary)]">
                  {s.type as string} · {s.mode as string}
                </span>
                {s.status === 'completed' ? (
                  <Link
                    href={`/interview/${profileId}/report/${s.id as string}`}
                    className="flex items-center gap-2"
                  >
                    <Badge variant="success">{(s.overall_score as number) ?? '—'}%</Badge>
                    <span className="text-xs font-semibold text-[var(--color-primary)]">View →</span>
                  </Link>
                ) : s.status === 'active' ? (
                  <Link
                    href={`/interview/${profileId}/session/${s.id as string}`}
                    className="text-xs font-semibold text-[var(--color-primary)]"
                  >
                    Resume →
                  </Link>
                ) : (
                  <Badge variant="default">{s.status as string}</Badge>
                )}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

type ContextProps = {
  questions: Array<{ id: string; question: string }>;
  answers: Record<string, string>;
  onEdit: () => void;
  showEdit: boolean;
  onCancelEdit: () => void;
  children?: React.ReactNode;
};

export function PrepContextDisclosure({
  questions,
  answers,
  onEdit,
  showEdit,
  onCancelEdit,
  children,
}: ContextProps) {
  const [open, setOpen] = useState(false);

  return (
    <Card padding="sm" className="border-[var(--color-border)]">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-sm font-semibold text-[var(--color-text-primary)]">
          Your interview context
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-[var(--color-muted)]" />
        ) : (
          <ChevronDown className="h-4 w-4 text-[var(--color-muted)]" />
        )}
      </button>
      {open ? (
        <div className="mt-3 space-y-3 border-t border-[var(--color-border)] pt-3">
          {showEdit && children ? (
            children
          ) : (
            <>
              <ul className="space-y-2 text-sm">
                {questions.map((q) => (
                  <li key={q.id}>
                    <p className="font-medium text-[var(--color-text-primary)]">{q.question}</p>
                    <p className="text-[var(--color-text-secondary)]">{answers[q.id] ?? '—'}</p>
                  </li>
                ))}
              </ul>
              <Button size="sm" variant="ghost" onClick={onEdit}>
                Edit & re-analyze
              </Button>
            </>
          )}
          {showEdit ? (
            <Button size="sm" variant="ghost" onClick={onCancelEdit}>
              Cancel
            </Button>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
