'use client';

import Link from 'next/link';
import { ClipboardList, Play, Trophy } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PREP_TOPIC_ALL } from '@/lib/interview/prep-topic-query';

type TopicRow = { id: string; name: string };

type Props = {
  profileId: string;
  quizAttempts: Record<string, unknown>[];
  inProgressQuiz: Record<string, unknown> | null;
  isReady: boolean;
  topics: TopicRow[];
  topicFilter: string;
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

function matchesTopicFilter(row: Record<string, unknown>, filter: string) {
  if (filter === PREP_TOPIC_ALL) return true;
  return (row.quiz_topic_id as string | null) === filter;
}

export function PrepQuizPanel({
  profileId,
  quizAttempts,
  inProgressQuiz,
  isReady,
  topics,
  topicFilter,
  onNewQuiz,
  onResumeQuiz,
  generating,
}: Props) {
  const selectedTopic = topics.find((t) => t.id === topicFilter);
  const visibleAttempts = quizAttempts.filter((a) => matchesTopicFilter(a, topicFilter));
  const visibleInProgress =
    inProgressQuiz && matchesTopicFilter(inProgressQuiz, topicFilter) ? inProgressQuiz : null;
  const completed = visibleAttempts.filter((a) => a.completed_at);
  const lastScore = completed[0]?.score as number | undefined;
  const canGenerate = isReady && topics.length > 0;
  const ctaLabel = selectedTopic
    ? `Take quiz on ${selectedTopic.name}`
    : 'Take quiz on all topics';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Quiz practice</h3>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            {selectedTopic
              ? `Test your knowledge of ${selectedTopic.name}`
              : 'Test your knowledge across all preparation topics'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {visibleInProgress ? (
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
            disabled={!canGenerate}
            onClick={() => void onNewQuiz()}
          >
            {visibleInProgress ? 'New quiz' : ctaLabel}
          </Button>
        </div>
      </div>

      {topics.length === 0 ? (
        <Card className="py-8 text-center text-sm text-[var(--color-muted)]">
          Generate preparation topics first, then take a quiz by topic or across all topics.
        </Card>
      ) : lastScore != null ? (
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

      {topics.length > 0 ? (
        <Card>
          {visibleAttempts.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--color-muted)]">
              {selectedTopic
                ? `No quizzes for ${selectedTopic.name} yet.`
                : 'No quizzes yet. Take a quiz on all topics or pick one topic.'}
            </p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {visibleAttempts.map((a) => {
                const done = Boolean(a.completed_at);
                const topicName = a.quiz_topic_name as string | null | undefined;
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
                        {topicName ? `${topicName} · ` : topicFilter === PREP_TOPIC_ALL ? 'All topics · ' : ''}
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
                          href={`/interview/${profileId}/quiz/${a.quiz_id as string}/review/${a.id as string}${
                            topicFilter === PREP_TOPIC_ALL ? '' : `?topic=${topicFilter}`
                          }`}
                          className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
                        >
                          Review →
                        </Link>
                      ) : (
                        <Link
                          href={`/interview/${profileId}/quiz/${a.quiz_id as string}${
                            topicFilter === PREP_TOPIC_ALL ? '' : `?topic=${topicFilter}`
                          }`}
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
      ) : null}
    </div>
  );
}
