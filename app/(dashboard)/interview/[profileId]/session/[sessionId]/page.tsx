'use client';

import { useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { InterviewAnswerArea } from '@/components/interview/InterviewAnswerArea';
import { SessionTimer } from '@/components/interview/SessionTimer';
import {
  useInterviewSession,
  useSubmitInterviewAnswer,
  useCompleteInterviewSession,
  useDebouncedSessionDraft,
} from '@/hooks/useInterview';

export default function InterviewSessionPage() {
  const params = useParams();
  const router = useRouter();
  const profileId = typeof params.profileId === 'string' ? params.profileId : '';
  const sessionId = typeof params.sessionId === 'string' ? params.sessionId : '';

  const { data, isLoading, refetch } = useInterviewSession(sessionId);
  const submit = useSubmitInterviewAnswer(sessionId);
  const complete = useCompleteInterviewSession(sessionId);

  const handleFinishEarly = useCallback(async () => {
    await complete.mutateAsync();
    router.push(`/interview/${profileId}/report/${sessionId}`);
  }, [complete, profileId, router, sessionId]);

  const saveDraft = useDebouncedSessionDraft(sessionId);

  if (isLoading || !data) {
    return <Skeleton className="mx-auto h-64 max-w-2xl rounded-xl" />;
  }

  const { session, current_question, latest_evaluation, answered_questions = [] } = data;
  const progress = session.question_count as number;
  const target = (session.target_question_count as number) ?? 8;
  const durationMinutes = (session.duration_minutes as number) ?? 25;
  const startedAt = (session.started_at as string) ?? (session.created_at as string);
  const currentId = current_question?.id as string | undefined;
  const priorAnswers = answered_questions.filter(
    (item) => (item.question.id as string) !== currentId
  );

  async function handleSubmit(payload: {
    text_answer?: string;
    transcript?: string;
    audio_path?: string;
  }) {
    const result = await submit.mutateAsync(payload);
    await refetch();
    if ((result as { complete?: boolean }).complete) {
      await complete.mutateAsync();
      router.push(`/interview/${profileId}/report/${sessionId}`);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={`/interview/${profileId}`}
        className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-primary)]"
      >
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>

      <PageHeader
        title="Mock interview"
        subtitle={`Question ${progress} / ${target}`}
      />

      <SessionTimer
        startedAt={startedAt}
        durationMinutes={durationMinutes}
        onTimeUp={() => void handleFinishEarly()}
      />

      {priorAnswers.length > 0 ? (
        <Card className="space-y-3" padding="sm">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">Previous answers</p>
          {priorAnswers.map((item) => (
            <div key={item.question.id as string} className="border-t border-[var(--color-border)] pt-2 first:border-0 first:pt-0">
              <p className="text-xs text-[var(--color-muted)]">Q{item.question.sequence as number}</p>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                {item.question.question_text as string}
              </p>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                {(item.answer.transcript as string) ||
                  (item.answer.text_answer as string) ||
                  '—'}
              </p>
            </div>
          ))}
        </Card>
      ) : null}

      {current_question ? (
        <Card className="space-y-4">
          <p className="text-xs capitalize text-[var(--color-muted)]">
            {current_question.question_type as string}
          </p>
          <p className="text-lg font-medium text-[var(--color-text-primary)]">
            {current_question.question_text as string}
          </p>

          <InterviewAnswerArea
            sessionId={sessionId}
            draft={(session.draft_answer as string) ?? ''}
            onDraftChange={saveDraft}
            onSubmit={(p) => void handleSubmit(p)}
            loading={submit.isPending}
            mode={session.mode as string}
          />
        </Card>
      ) : (
        <Card className="py-8 text-center">
          <p className="text-[var(--color-muted)]">Interview complete or loading next question…</p>
          <Button variant="primary" className="mt-4" onClick={() => void handleFinishEarly()}>
            View report
          </Button>
        </Card>
      )}

      {session.mode === 'practice' && latest_evaluation?.feedback ? (
        <Card padding="sm">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">Feedback</p>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            {latest_evaluation.feedback as string}
          </p>
        </Card>
      ) : null}

      <Button variant="ghost" size="sm" onClick={() => void handleFinishEarly()}>
        End interview early
      </Button>
    </div>
  );
}
