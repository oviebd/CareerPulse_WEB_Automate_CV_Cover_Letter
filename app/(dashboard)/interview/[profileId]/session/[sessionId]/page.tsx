'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pause, Play } from 'lucide-react';
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
  usePauseInterviewSession,
  useResumeInterviewSession,
} from '@/hooks/useInterview';

type TurnFeedback = {
  instant_feedback: string;
  overall_score?: number;
  questionText: string;
  answerText: string;
};

export default function InterviewSessionPage() {
  const params = useParams();
  const router = useRouter();
  const profileId = typeof params.profileId === 'string' ? params.profileId : '';
  const sessionId = typeof params.sessionId === 'string' ? params.sessionId : '';

  const { data, isLoading, refetch } = useInterviewSession(sessionId);
  const submit = useSubmitInterviewAnswer(sessionId);
  const complete = useCompleteInterviewSession(sessionId);
  const pause = usePauseInterviewSession(sessionId);
  const resume = useResumeInterviewSession(sessionId);

  const [turnFeedback, setTurnFeedback] = useState<TurnFeedback | null>(null);
  const [turnComplete, setTurnComplete] = useState(false);
  const pausedOnLeave = useRef(false);
  const skipPause = useRef(false);

  const handleFinishEarly = useCallback(async () => {
    skipPause.current = true;
    await complete.mutateAsync();
    router.push(`/interview/${profileId}/report/${sessionId}`);
  }, [complete, profileId, router, sessionId]);

  const saveDraft = useDebouncedSessionDraft(sessionId);

  const handlePause = useCallback(async () => {
    await pause.mutateAsync();
    await refetch();
  }, [pause, refetch]);

  const handleResume = useCallback(async () => {
    await resume.mutateAsync();
    await refetch();
  }, [resume, refetch]);

  useEffect(() => {
    const pauseOnLeave = () => {
      if (pausedOnLeave.current) return;
      pausedOnLeave.current = true;
      void fetch(`/api/interview/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pause' }),
        keepalive: true,
      });
    };

    window.addEventListener('beforeunload', pauseOnLeave);
    return () => {
      window.removeEventListener('beforeunload', pauseOnLeave);
      if (data?.session.status === 'active' && !skipPause.current) {
        pauseOnLeave();
      }
    };
  }, [sessionId, data?.session.status]);

  if (isLoading || !data) {
    return <Skeleton className="mx-auto h-64 max-w-2xl rounded-xl" />;
  }

  const { session, current_question, answered_questions = [] } = data;
  const progress = session.question_count as number;
  const target = (session.target_question_count as number) ?? 8;
  const durationMinutes = (session.duration_minutes as number) ?? 25;
  const elapsedSeconds = (session.elapsed_seconds as number) ?? 0;
  const timerStartedAt = (session.timer_started_at as string) ?? null;
  const sessionStatus = session.status as string;
  const isPaused = sessionStatus === 'paused';
  const isPractice = session.mode === 'practice';
  const currentId = current_question?.id as string | undefined;
  const priorAnswers = answered_questions.filter(
    (item) => (item.question.id as string) !== currentId
  );

  async function handleSubmit(payload: {
    text_answer?: string;
    transcript?: string;
    audio_path?: string;
  }) {
    const answerText = payload.transcript?.trim() || payload.text_answer?.trim() || '';
    const result = (await submit.mutateAsync(payload)) as {
      complete?: boolean;
      instant_feedback?: string;
      overall_score?: number;
    };

    setTurnFeedback({
      instant_feedback: result.instant_feedback ?? '',
      overall_score: result.overall_score,
      questionText: (current_question?.question_text as string) ?? '',
      answerText,
    });
    setTurnComplete(Boolean(result.complete));

    if (result.complete) {
      skipPause.current = true;
      await complete.mutateAsync();
      router.push(`/interview/${profileId}/report/${sessionId}`);
    }
  }

  function handleContinue() {
    setTurnFeedback(null);
    setTurnComplete(false);
    void refetch();
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

      <div className="flex items-center justify-between gap-3">
        <SessionTimer
          durationMinutes={durationMinutes}
          elapsedSeconds={elapsedSeconds}
          timerStartedAt={timerStartedAt}
          status={sessionStatus}
          onTimeUp={() => void handleFinishEarly()}
        />
        {isPaused ? (
          <Button
            variant="secondary"
            size="sm"
            icon={<Play className="h-4 w-4" />}
            loading={resume.isPending}
            onClick={() => void handleResume()}
          >
            Resume
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            icon={<Pause className="h-4 w-4" />}
            loading={pause.isPending}
            onClick={() => void handlePause()}
          >
            Pause
          </Button>
        )}
      </div>

      {isPaused ? (
        <Card className="py-8 text-center">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">Interview paused</p>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Your timer is frozen. Resume when you are ready to continue.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="primary" loading={resume.isPending} onClick={() => void handleResume()}>
              Resume interview
            </Button>
            <Button variant="ghost" onClick={() => void handleFinishEarly()}>
              End interview
            </Button>
          </div>
        </Card>
      ) : null}

      {!isPaused && priorAnswers.length > 0 ? (
        <Card className="space-y-3" padding="sm">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">Previous answers</p>
          {priorAnswers.map((item) => {
            const evalRow = item.evaluation;
            const score = evalRow?.overall_score as number | undefined;
            return (
              <div
                key={item.question.id as string}
                className="border-t border-[var(--color-border)] pt-2 first:border-0 first:pt-0"
              >
                <p className="text-xs text-[var(--color-muted)]">Q{item.question.sequence as number}</p>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  {item.question.question_text as string}
                </p>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  {(item.answer.transcript as string) ||
                    (item.answer.text_answer as string) ||
                    '—'}
                </p>
                {evalRow?.feedback ? (
                  <p className="mt-2 text-xs text-[var(--color-muted)]">
                    {isPractice && score != null ? (
                      <span className="mr-2 font-semibold text-[var(--color-primary)]">
                        {score / 10}/10 ·{' '}
                      </span>
                    ) : null}
                    {evalRow.feedback as string}
                  </p>
                ) : null}
              </div>
            );
          })}
        </Card>
      ) : null}

      {!isPaused && turnFeedback ? (
        <Card className="space-y-4 border-[var(--color-primary-200)]/50 bg-[var(--color-primary-50)]/30">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            Interviewer
          </p>
          {isPractice && turnFeedback.overall_score != null ? (
            <p className="text-sm font-semibold text-[var(--color-primary)]">
              Score: {turnFeedback.overall_score}/10
            </p>
          ) : null}
          <p className="text-sm text-[var(--color-text-primary)]">{turnFeedback.instant_feedback}</p>
          {!turnComplete ? (
            <Button variant="primary" onClick={handleContinue}>
              Continue to next question
            </Button>
          ) : null}
        </Card>
      ) : null}

      {!isPaused && !turnFeedback && current_question ? (
        <Card className="space-y-4">
          <p className="text-xs capitalize text-[var(--color-muted)]">
            {current_question.question_type as string}
          </p>
          <p className="text-lg font-medium text-[var(--color-text-primary)]">
            {current_question.question_text as string}
          </p>

          <InterviewAnswerArea
            key={current_question.id as string}
            sessionId={sessionId}
            draft={(session.draft_answer as string) ?? ''}
            onDraftChange={saveDraft}
            onSubmit={(p) => void handleSubmit(p)}
            loading={submit.isPending}
            mode={session.mode as string}
          />
        </Card>
      ) : null}

      {!isPaused && !turnFeedback && !current_question ? (
        <Card className="py-8 text-center">
          <p className="text-[var(--color-muted)]">Interview complete or loading next question…</p>
          <Button variant="primary" className="mt-4" onClick={() => void handleFinishEarly()}>
            View report
          </Button>
        </Card>
      ) : null}

      {!isPaused ? (
        <Button variant="ghost" size="sm" onClick={() => void handleFinishEarly()}>
          End interview early
        </Button>
      ) : null}
    </div>
  );
}
