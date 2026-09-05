'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, ClipboardList, MessageSquare } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ReadinessCard } from '@/components/interview/ReadinessCard';
import { ClarificationForm } from '@/components/interview/ClarificationForm';
import { PrepQuestionList } from '@/components/interview/PrepQuestionList';
import { DeleteInterviewProfileButton } from '@/components/interview/DeleteInterviewProfileButton';
import {
  useInterviewProfile,
  usePrepareInterview,
  useGenerateQuiz,
  useClarifyInterview,
  useStartInterview,
} from '@/hooks/useInterview';
import type { ClarificationPayload } from '@/types/interview';

export default function InterviewDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const profileId = typeof params.profileId === 'string' ? params.profileId : '';

  const { data, isLoading, isError, error, refetch } = useInterviewProfile(profileId);
  const prepare = usePrepareInterview();
  const quiz = useGenerateQuiz();
  const clarify = useClarifyInterview();
  const retryStart = useStartInterview();

  const [showClarifyEdit, setShowClarifyEdit] = useState(false);
  const [clarifyError, setClarifyError] = useState<string | null>(null);

  if (isLoading) {
    return <Skeleton className="mx-auto h-64 max-w-4xl rounded-xl" />;
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Card className="space-y-3 p-6 text-center">
          <p className="text-sm font-medium text-[var(--color-text-primary)]">
            Could not load this interview profile.
          </p>
          <p className="text-sm text-[var(--color-muted)]">
            {error instanceof Error ? error.message : 'The profile may still be analyzing. Try again.'}
          </p>
          <div className="flex justify-center gap-2">
            <Button size="sm" variant="primary" onClick={() => void refetch()}>
              Retry
            </Button>
            <Link href="/interview">
              <Button size="sm" variant="secondary">
                Back to interview list
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const { profile, readiness, topics, sessions, plan, quiz_attempts, in_progress_quiz } = data;
  const clarification = profile.clarification_json as ClarificationPayload | null;
  const isReady = profile.status === 'ready' && Boolean(profile.blueprint_json);
  const isAnalyzing = profile.status === 'analyzing' || clarify.isPending;
  const analyzingStaleMs = 5 * 60 * 1000;
  const isAnalyzingStale =
    profile.status === 'analyzing' &&
    !clarify.isPending &&
    Date.now() - new Date(profile.updated_at).getTime() > analyzingStaleMs;

  async function handlePrepare(force = false) {
    await prepare.mutateAsync(force ? { profileId, force: true } : profileId);
    void refetch();
  }

  async function handleResumeQuiz() {
    if (!in_progress_quiz?.quiz_id) return;
    router.push(`/interview/${profileId}/quiz/${in_progress_quiz.quiz_id as string}`);
  }

  async function handleNewQuiz() {
    const result = await quiz.mutateAsync({ profile_id: profileId });
    router.push(`/interview/${profileId}/quiz/${result.quiz.id}`);
  }

  async function handleClarify(answers: Record<string, string>) {
    setClarifyError(null);
    try {
      const result = await clarify.mutateAsync({ profile_id: profileId, answers });
      setShowClarifyEdit(false);
      await refetch();
      if (result.status === 'ready') {
        router.push(`/interview/${profileId}#likely-questions`);
      }
    } catch (e) {
      setClarifyError(
        e instanceof Error ? e.message : 'Analysis failed. Please try again in a moment.'
      );
      void refetch();
    }
  }

  async function handleRetry() {
    await retryStart.mutateAsync({ job_id: profile.job_id });
    void refetch();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/interview"
        className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-primary)]"
      >
        <ArrowLeft className="h-4 w-4" /> Interview prep
      </Link>

      <PageHeader
        title={profile.job_title ?? 'Interview prep'}
        subtitle={profile.company_name ?? undefined}
        actions={
          <>
            {profile.status === 'ready' ? (
              <span className="rounded-full bg-[var(--color-primary-100)] px-3 py-1 text-xs font-semibold text-[var(--color-primary)]">
                Ready
              </span>
            ) : profile.status === 'analyzing' || clarify.isPending ? (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                Analyzing…
              </span>
            ) : profile.status === 'failed' ? (
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
                Failed
              </span>
            ) : profile.status === 'needs_clarification' ? (
              <span className="rounded-full bg-[var(--color-primary-100)] px-3 py-1 text-xs font-semibold text-[var(--color-primary)]">
                Setup needed
              </span>
            ) : null}
            <DeleteInterviewProfileButton profileId={profileId} label="Delete" redirectTo="/interview" />
          </>
        }
      />

      {isAnalyzing ? (
        <Card className="border-amber-200/60 bg-amber-50/50 p-4 text-sm dark:bg-amber-950/20">
          <p className="font-medium text-amber-950 dark:text-amber-100">
            Building your interview profile and preparation plan…
          </p>
          <p className="mt-1 text-[var(--color-muted)]">
            This usually takes 1–3 minutes. Keep this tab open — the page updates automatically.
          </p>
          {isAnalyzingStale ? (
            <Button
              className="mt-3"
              size="sm"
              variant="secondary"
              loading={retryStart.isPending}
              onClick={() => void handleRetry()}
            >
              Retry analysis
            </Button>
          ) : null}
        </Card>
      ) : null}

      {profile.status === 'failed' ? (
        <Card className="border-red-200/60 bg-red-50/50 p-4 dark:bg-red-950/20">
          <p className="text-sm font-medium text-red-900 dark:text-red-100">Analysis failed.</p>
          <Button className="mt-3" size="sm" variant="primary" loading={retryStart.isPending} onClick={() => void handleRetry()}>
            Retry analysis
          </Button>
        </Card>
      ) : null}

      {profile.status === 'needs_clarification' && clarification?.questions?.length && !isAnalyzing ? (
        <>
          <Card className="border-[var(--color-border)] bg-[var(--color-surface-2)]/40 p-4 text-sm">
            <p className="font-medium text-[var(--color-text-primary)]">
              Step 1 — Fill gaps in your profile
            </p>
            <p className="mt-1 text-[var(--color-muted)]">
              These setup questions help us analyze your CV against the job. After you continue,
              you&apos;ll get <strong className="font-medium text-[var(--color-text-secondary)]">likely interview questions</strong> with an{' '}
              <strong className="font-medium text-[var(--color-text-secondary)]">Answer</strong> button
              to reveal personalized suggested answers (you don&apos;t type answers from scratch).
            </p>
          </Card>
          {clarifyError ? (
            <Card className="border-[var(--color-danger)]/30 bg-[var(--color-surface-2)]/40 p-4 text-sm">
              <p className="font-medium text-[var(--color-danger)]">Analysis failed</p>
              <p className="mt-1 text-[var(--color-muted)]">{clarifyError}</p>
            </Card>
          ) : null}
          <ClarificationForm
            questions={clarification.questions}
            initialAnswers={clarification.answers}
            onSubmit={(a) => void handleClarify(a)}
            loading={clarify.isPending}
          />
        </>
      ) : null}

      {isReady ? (
        <PrepQuestionList profileId={profileId} profileReady={isReady} profileStatus={profile.status} />
      ) : null}

      {clarification?.answers && Object.keys(clarification.answers).length > 0 && profile.status === 'ready' ? (
        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Your interview context</h3>
            <Button size="sm" variant="ghost" onClick={() => setShowClarifyEdit((v) => !v)}>
              {showClarifyEdit ? 'Cancel' : 'Edit & re-analyze'}
            </Button>
          </div>
          {showClarifyEdit && clarification.questions?.length ? (
            <ClarificationForm
              questions={clarification.questions}
              initialAnswers={clarification.answers}
              onSubmit={(a) => void handleClarify(a)}
              loading={clarify.isPending}
            />
          ) : (
            <ul className="space-y-2 text-sm">
              {clarification.questions?.map((q) => (
                <li key={q.id}>
                  <p className="font-medium text-[var(--color-text-primary)]">{q.question}</p>
                  <p className="text-[var(--color-text-secondary)]">{clarification.answers?.[q.id] ?? '—'}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <ReadinessCard readiness={readiness} />
        </Card>
        <Card className="space-y-3">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">
            Today&apos;s recommendation
          </p>
          <p className="text-sm text-[var(--color-text-secondary)]">{readiness.next_action}</p>
          <div className="flex flex-wrap gap-2 pt-2">
            {!plan ? (
              <Button
                variant="primary"
                size="sm"
                loading={prepare.isPending}
                onClick={() => void handlePrepare(false)}
                disabled={!isReady}
              >
                Generate topics
              </Button>
            ) : (
              <Link href={`/interview/${profileId}/prepare#likely-questions`}>
                <Button variant="secondary" size="sm" icon={<BookOpen className="h-4 w-4" />} disabled={!isReady}>
                  View topics
                </Button>
              </Link>
            )}
            {isReady ? (
              <Link href={`/interview/${profileId}/prepare#likely-questions`}>
                <Button variant="secondary" size="sm" icon={<MessageSquare className="h-4 w-4" />}>
                  Likely questions
                </Button>
              </Link>
            ) : null}
            {plan ? (
              <Button
                variant="ghost"
                size="sm"
                loading={prepare.isPending}
                onClick={() => void handlePrepare(true)}
                disabled={!isReady}
              >
                Regenerate topics
              </Button>
            ) : null}
            {in_progress_quiz ? (
              <Button
                variant="secondary"
                size="sm"
                icon={<ClipboardList className="h-4 w-4" />}
                onClick={() => void handleResumeQuiz()}
                disabled={!isReady}
              >
                Resume quiz
              </Button>
            ) : null}
            <Button
              variant="secondary"
              size="sm"
              icon={<ClipboardList className="h-4 w-4" />}
              loading={quiz.isPending}
              onClick={() => void handleNewQuiz()}
              disabled={!isReady}
            >
              {in_progress_quiz ? 'New quiz' : 'Take quiz'}
            </Button>
            {isReady ? (
              <Link href={`/interview/${profileId}/lobby`}>
                <Button variant="primary" size="sm" icon={<MessageSquare className="h-4 w-4" />}>
                  Mock interview
                </Button>
              </Link>
            ) : (
              <Button variant="primary" size="sm" icon={<MessageSquare className="h-4 w-4" />} disabled>
                Mock interview
              </Button>
            )}
          </div>
        </Card>
      </div>

      {quiz_attempts.length > 0 ? (
        <Card>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Quiz history</h3>
            <Link href={`/interview/${profileId}/quizzes`} className="text-xs font-semibold text-[var(--color-primary)]">
              See all
            </Link>
          </div>
          <ul className="mt-3 space-y-2">
            {quiz_attempts.slice(0, 5).map((a) => (
              <li key={a.id as string} className="flex justify-between text-sm">
                <span className="text-[var(--color-text-secondary)]">{a.quiz_title as string}</span>
                {a.completed_at ? (
                  <Link
                    href={`/interview/${profileId}/quiz/${a.quiz_id as string}/review/${a.id as string}`}
                    className="font-semibold text-[var(--color-primary)]"
                  >
                    {a.score as number}% →
                  </Link>
                ) : (
                  <Link
                    href={`/interview/${profileId}/quiz/${a.quiz_id as string}`}
                    className="font-semibold text-[var(--color-primary)]"
                  >
                    Resume →
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {sessions.length > 0 ? (
        <Card>
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Interview history
          </h3>
          <ul className="mt-3 space-y-2">
            {sessions.slice(0, 5).map((s) => (
              <li key={s.id as string} className="flex justify-between text-sm">
                <span className="capitalize text-[var(--color-text-secondary)]">
                  {s.type as string} · {s.mode as string}
                </span>
                {s.status === 'completed' ? (
                  <Link
                    href={`/interview/${profileId}/report/${s.id as string}`}
                    className="font-semibold text-[var(--color-primary)]"
                  >
                    {(s.overall_score as number) ?? '—'}% →
                  </Link>
                ) : s.status === 'active' ? (
                  <Link
                    href={`/interview/${profileId}/session/${s.id as string}`}
                    className="font-semibold text-[var(--color-primary)]"
                  >
                    Resume →
                  </Link>
                ) : (
                  <span>{s.status as string}</span>
                )}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {topics.length > 0 ? (
        <Card>
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Preparation topics ({topics.length})
          </h3>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            Focus areas tailored to this role
          </p>
        </Card>
      ) : null}
    </div>
  );
}
