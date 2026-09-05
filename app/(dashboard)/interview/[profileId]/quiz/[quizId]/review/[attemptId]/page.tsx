'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-fetch';
import { useGenerateQuiz } from '@/hooks/useInterview';
import { useRouter } from 'next/navigation';

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
  const profileId = typeof params.profileId === 'string' ? params.profileId : '';
  const quizId = typeof params.quizId === 'string' ? params.quizId : '';
  const attemptId = typeof params.attemptId === 'string' ? params.attemptId : '';
  const generateQuiz = useGenerateQuiz();

  const { data, isLoading } = useQuery({
    queryKey: ['interview-quiz-review', quizId, attemptId],
    queryFn: () =>
      apiFetch<ReviewPayload>(`/api/interview/quizzes/${quizId}/attempts/${attemptId}`),
    enabled: Boolean(quizId && attemptId),
  });

  async function handleNewQuiz() {
    const next = await generateQuiz.mutateAsync({ profile_id: profileId });
    router.push(`/interview/${profileId}/quiz/${next.quiz.id}`);
  }

  if (isLoading || !data) {
    return <Skeleton className="mx-auto h-64 max-w-3xl rounded-xl" />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/interview/${profileId}/quizzes`}
        className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-primary)]"
      >
        <ArrowLeft className="h-4 w-4" /> Quiz history
      </Link>

      <PageHeader
        title={data.attempt.quiz_title ?? 'Quiz review'}
        subtitle={`Score: ${data.attempt.score ?? '—'}%`}
      />

      <div className="space-y-4">
        {data.review.map((item, index) => (
          <Card key={item.id} className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                {index + 1}. {item.question_text}
              </p>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                  item.correct
                    ? 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300'
                }`}
              >
                {item.correct ? 'Correct' : 'Incorrect'}
              </span>
            </div>
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-[var(--color-muted)]">Your answer: </span>
                {formatAnswer(item.user_answer)}
              </p>
              <p>
                <span className="text-[var(--color-muted)]">Correct answer: </span>
                {formatAnswer(item.correct_answer)}
              </p>
              {item.explanation ? (
                <p className="text-[var(--color-text-secondary)]">{item.explanation}</p>
              ) : null}
            </div>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="primary" loading={generateQuiz.isPending} onClick={() => void handleNewQuiz()}>
          Take another quiz
        </Button>
        <Link href={`/interview/${profileId}`}>
          <Button variant="secondary">Back to dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
