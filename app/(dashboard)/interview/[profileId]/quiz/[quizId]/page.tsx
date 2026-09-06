'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Trophy } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { QuizQuestionField } from '@/components/interview/QuizQuestionField';
import { apiFetch } from '@/lib/api-fetch';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useGenerateQuiz, useQuizAttempt, useSaveQuizDraft } from '@/hooks/useInterview';

type SubmitResult = {
  score?: number;
  attempt?: { id?: string };
};

export default function InterviewQuizPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const profileId = typeof params.profileId === 'string' ? params.profileId : '';
  const quizId = typeof params.quizId === 'string' ? params.quizId : '';

  const { data, isLoading } = useQuery({
    queryKey: ['interview-quiz', quizId],
    queryFn: () =>
      apiFetch<{
        quiz: { title?: string };
        questions: Array<{
          id: string;
          question_type: string;
          question_text: string;
          options_json?: string[] | null;
        }>;
      }>(`/api/interview/quizzes/${quizId}`),
    enabled: Boolean(quizId),
  });

  const { data: attemptData } = useQuizAttempt(quizId);
  const saveDraft = useSaveQuizDraft(quizId);
  const generateQuiz = useGenerateQuiz();

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current || !attemptData?.attempt?.answers_json) return;
    const payload = attemptData.attempt.answers_json as {
      answers?: Record<string, string>;
      current_step?: number;
    };
    if (payload.answers) setAnswers(payload.answers);
    if (typeof payload.current_step === 'number') setStep(payload.current_step);
    hydrated.current = true;
  }, [attemptData]);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function persistDraft(nextAnswers: Record<string, string>, nextStep: number) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void saveDraft.mutateAsync({ answers: nextAnswers, current_step: nextStep }).catch(() => undefined);
    }, 600);
  }

  function updateAnswer(questionId: string, value: string) {
    setAnswers((prev) => {
      const next = { ...prev, [questionId]: value };
      persistDraft(next, step);
      return next;
    });
  }

  function goToStep(next: number) {
    setStep(next);
    persistDraft(answers, next);
  }

  async function handleSubmitAll() {
    setSubmitting(true);
    try {
      const payload = (data?.questions ?? []).map((q) => ({
        question_id: q.id,
        answer: answers[q.id] ?? '',
      }));
      const res = await apiFetch<SubmitResult>(`/api/interview/quizzes/${quizId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers: payload }),
      });
      setResult(res);
      void queryClient.invalidateQueries({ queryKey: ['interview-profile', profileId] });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleNewQuiz() {
    const next = await generateQuiz.mutateAsync({ profile_id: profileId });
    router.push(`/interview/${profileId}/quiz/${next.quiz.id}`);
  }

  if (isLoading || !data) {
    return <Skeleton className="mx-auto h-64 max-w-2xl rounded-xl" />;
  }

  const questions = data.questions;
  const current = questions[step];
  const progressPct = questions.length > 0 ? Math.round(((step + 1) / questions.length) * 100) : 0;

  if (result) {
    const attemptId = result.attempt?.id;
    const score = result.score ?? 0;
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Card className="space-y-4 py-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-accent-gold)]/15 text-[var(--color-accent-gold)]">
            <Trophy className="h-7 w-7" />
          </div>
          <div>
            <p className="text-sm text-[var(--color-muted)]">Quiz complete</p>
            <p className="font-display text-5xl font-bold text-[var(--color-primary)]">
              {score}%
            </p>
          </div>
          <Progress value={score} className="mx-auto max-w-xs" />
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {attemptId ? (
              <Link href={`/interview/${profileId}/quiz/${quizId}/review/${attemptId}`}>
                <Button variant="secondary">View result</Button>
              </Link>
            ) : null}
            <Button variant="primary" loading={generateQuiz.isPending} onClick={() => void handleNewQuiz()}>
              Take another quiz
            </Button>
            <Link href={`/interview/${profileId}?tab=quiz`}>
              <Button variant="ghost">Back to dashboard</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={`/interview/${profileId}?tab=quiz`}
        className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-primary)]"
      >
        <ArrowLeft className="h-4 w-4" /> Quiz
      </Link>

      <PageHeader
        title={data.quiz.title ?? 'Quiz'}
        subtitle={`Question ${step + 1} of ${questions.length}`}
      />

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-[var(--color-muted)]">
          <span>Progress</span>
          <span>{progressPct}%</span>
        </div>
        <Progress value={progressPct} className="h-2" />
      </div>

      {current ? (
        <Card className="space-y-4">
          <Badge variant="info" className="capitalize">
            {current.question_type.replace(/_/g, ' ')}
          </Badge>
          <p className="text-base font-medium leading-relaxed text-[var(--color-text-primary)]">
            {current.question_text}
          </p>
          <QuizQuestionField
            question={current}
            value={answers[current.id] ?? ''}
            onChange={(v) => updateAnswer(current.id, v)}
          />
          <div className="flex justify-between border-t border-[var(--color-border)] pt-4">
            <Button variant="ghost" size="sm" disabled={step === 0} onClick={() => goToStep(step - 1)}>
              Previous
            </Button>
            {step < questions.length - 1 ? (
              <Button variant="primary" size="sm" onClick={() => goToStep(step + 1)}>
                Next
              </Button>
            ) : (
              <Button variant="primary" size="sm" loading={submitting} onClick={() => void handleSubmitAll()}>
                Submit quiz
              </Button>
            )}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
