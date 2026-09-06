'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-fetch';
import { useGenerateQuiz } from '@/hooks/useInterview';
import { parsePrepTopicParam, prepDashboardHref, quizHref, topicIdForApi } from '@/lib/interview/prep-topic-query';

type ReviewPayload = {
  attempt: {
    id: string;
    quiz_title?: string;
    score?: number;
    completed_at?: string;
  };
  review: Array<{
    id: string;
    question_type: string;
    question_text: string;
    user_answer: string;
    correct_answer: unknown;
    explanation?: string | null;
    correct: boolean;
  }>;
};

function formatAnswer(value: unknown) {
  if (Array.isArray(value)) return value.join(', ');
  if (value === true) return 'True';
  if (value === false) return 'False';
  if (value == null || value === '') return '—';
  return String(value);
}

export default function QuizReviewPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const profileId = typeof params.profileId === 'string' ? params.profileId : '';
  const quizId = typeof params.quizId === 'string' ? params.quizId : '';
  const attemptId = typeof params.attemptId === 'string' ? params.attemptId : '';
  const generateQuiz = useGenerateQuiz();
  const topicFilter = parsePrepTopicParam(searchParams.get('topic'));

  const { data, isLoading } = useQuery({
    queryKey: ['interview-quiz-review', quizId, attemptId],
    queryFn: () =>
      apiFetch<ReviewPayload>(`/api/interview/quizzes/${quizId}/attempts/${attemptId}`),
    enabled: Boolean(quizId && attemptId),
  });

  async function handleNewQuiz() {
    const next = await generateQuiz.mutateAsync({
      profile_id: profileId,
      topic_id: topicIdForApi(topicFilter),
    });
    router.push(quizHref(profileId, next.quiz.id, topicFilter));
  }

  if (isLoading || !data) {
    return <Skeleton className="mx-auto h-64 max-w-3xl rounded-xl" />;
  }

  const score = data.attempt.score ?? 0;
  const correctCount = data.review.filter((r) => r.correct).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={prepDashboardHref(profileId, 'quiz', topicFilter)}
        className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-primary)]"
      >
        <ArrowLeft className="h-4 w-4" /> Quiz
      </Link>

      <Card className="space-y-3 border-[var(--color-primary-200)]/40 bg-gradient-to-br from-[var(--color-primary-50)]/40 to-transparent">
        <PageHeader
          title={data.attempt.quiz_title ?? 'Quiz review'}
          subtitle={`${correctCount} of ${data.review.length} correct`}
        />
        <div className="flex items-end gap-3">
          <p className="font-display text-4xl font-bold text-[var(--color-primary)]">{score}%</p>
          <Badge variant={score >= 70 ? 'success' : score >= 50 ? 'warning' : 'danger'}>
            {score >= 70 ? 'Great job' : score >= 50 ? 'Good effort' : 'Keep practicing'}
          </Badge>
        </div>
        <Progress value={score} className="h-2" />
      </Card>

      <div className="space-y-4">
        {data.review.map((item, index) => (
          <Card
            key={item.id}
            padding="sm"
            className={
              item.correct
                ? 'border-[var(--color-accent-mint)]/25 bg-[var(--color-accent-mint)]/5'
                : 'border-[var(--color-accent-coral)]/25 bg-[var(--color-accent-coral)]/5'
            }
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium leading-relaxed text-[var(--color-text-primary)]">
                {index + 1}. {item.question_text}
              </p>
              {item.correct ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--color-accent-mint)]" />
              ) : (
                <XCircle className="h-5 w-5 shrink-0 text-[var(--color-accent-coral)]" />
              )}
            </div>
            <div className="mt-3 space-y-2 text-sm">
              <div className="rounded-lg bg-[var(--color-surface-faint)] px-3 py-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                  Your answer
                </span>
                <p className="mt-0.5 text-[var(--color-text-primary)]">
                  {formatAnswer(item.user_answer)}
                </p>
              </div>
              {!item.correct ? (
                <div className="rounded-lg border border-[var(--color-accent-mint)]/25 bg-[var(--color-accent-mint)]/8 px-3 py-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-accent-mint)]">
                    Correct answer
                  </span>
                  <p className="mt-0.5 text-[var(--color-text-secondary)]">
                    {formatAnswer(item.correct_answer)}
                  </p>
                </div>
              ) : null}
              {item.explanation ? (
                <p className="text-xs leading-relaxed text-[var(--color-muted)]">{item.explanation}</p>
              ) : null}
            </div>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="primary" loading={generateQuiz.isPending} onClick={() => void handleNewQuiz()}>
          Take another quiz
        </Button>
        <Link href={prepDashboardHref(profileId, 'quiz', topicFilter)}>
          <Button variant="secondary">Back to dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
