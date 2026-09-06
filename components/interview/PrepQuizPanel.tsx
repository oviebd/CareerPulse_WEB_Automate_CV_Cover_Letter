'use client';

import Link from 'next/link';
import { ClipboardList, Play, Trophy } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type Props = {
  profileId: string;
  quizAttempts: Record<string, unknown>[];
  inProgressQuiz: Record<string, unknown> | null;
  isReady: boolean;
  onNewQuiz: () => Promise<void>;
  onResumeQuiz: () => void;
  generating?: boolean;
};

function formatDate(value: unknown) {
  if (!value || typeof value !== 'string') return '—';
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function PrepQuizPanel({
  profileId,
  quizAttempts,
  inProgressQuiz,
  isReady,
  onNewQuiz,
  onResumeQuiz,
  generating,
}: Props) {
  const completed = quizAttempts.filter((a) => a.completed_at);
  const lastScore = completed[0]?.score as number | undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Quiz practice</h3>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            Test your knowledge with role-specific questions
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {inProgressQuiz ? (
            <Button
              size="sm"
              variant="secondary"
              icon={<Play className="h-4 w-4" />}
              disabled={!isReady}
              onClick={onResumeQuiz}
            >
              Resume quiz
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="primary"
            icon={<ClipboardList className="h-4 w-4" />}
            loading={generating}
            disabled={!isReady}
            onClick={() => void onNewQuiz()}
          >
            {inProgressQuiz ? 'New quiz' : 'Take quiz'}
          </Button>
        </div>
      </div>

      {lastScore != null ? (
        <Card
          padding="sm"
          className="flex items-center gap-4 border-[var(--color-accent-gold)]/25 bg-[var(--color-accent-gold)]/5"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-accent-gold)]/15 text-[var(--color-accent-gold)]">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
              Latest score
            </p>
            <p className="font-display text-2xl font-bold text-[var(--color-text-primary)]">
              {lastScore}%
            </p>
          </div>
        </Card>
      ) : null}

      <Card>
        {quizAttempts.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--color-muted)]">
            No quizzes yet. Take your first quiz to boost your readiness score.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {quizAttempts.map((a) => {
              const done = Boolean(a.completed_at);
              return (
                <li
                  key={a.id as string}
                  className="flex items-center justify-between gap-4 py-3 text-sm first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[var(--color-text-primary)]">
                      {a.quiz_title as string}
                    </p>
                    <p className="text-xs text-[var(--color-muted)]">
                      {formatDate(a.started_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {done ? (
                      <Badge variant="success">{a.score as number}%</Badge>
                    ) : (
                      <Badge variant="warning">In progress</Badge>
                    )}
                    {done ? (
                      <Link
                        href={`/interview/${profileId}/quiz/${a.quiz_id as string}/review/${a.id as string}`}
                        className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
                      >
                        Review →
                      </Link>
                    ) : (
                      <Link
                        href={`/interview/${profileId}/quiz/${a.quiz_id as string}`}
                        className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
                      >
                        Resume →
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
