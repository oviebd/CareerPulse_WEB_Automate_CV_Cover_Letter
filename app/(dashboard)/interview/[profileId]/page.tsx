'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PrepProgressHero } from '@/components/interview/PrepProgressHero';
import { PrepActionNav } from '@/components/interview/PrepActionNav';
import { PrepTabPanel } from '@/components/interview/PrepTabPanel';
import { PrepTopicsPanel } from '@/components/interview/PrepTopicsPanel';
import { PrepQuizPanel } from '@/components/interview/PrepQuizPanel';
import { PrepMockPanel, PrepContextDisclosure } from '@/components/interview/PrepMockPanel';
import { PrepQuestionList } from '@/components/interview/PrepQuestionList';
import { ClarificationForm } from '@/components/interview/ClarificationForm';
import { DeleteInterviewProfileButton } from '@/components/interview/DeleteInterviewProfileButton';
import { parsePrepTab, type PrepTab } from '@/components/interview/prep-tabs';
import {
  useInterviewProfile,
  usePrepareInterview,
  useGenerateQuiz,
  useClarifyInterview,
  useStartInterview,
  usePrepQuestions,
} from '@/hooks/useInterview';
import type { ClarificationPayload } from '@/types/interview';

function ProfileStatusBadge({ status, analyzing }: { status: string; analyzing?: boolean }) {
  if (analyzing) return <Badge variant="warning">Analyzing…</Badge>;
  if (status === 'ready') return <Badge variant="info">Ready</Badge>;
  if (status === 'failed') return <Badge variant="danger">Failed</Badge>;
  if (status === 'needs_clarification') return <Badge variant="info">Setup needed</Badge>;
  return null;
}

export default function InterviewDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const profileId = typeof params.profileId === 'string' ? params.profileId : '';

  const { data, isLoading, isError, error, refetch } = useInterviewProfile(profileId);
  const { data: prepQuestionsData } = usePrepQuestions(profileId);
  const prepare = usePrepareInterview();
  const quiz = useGenerateQuiz();
  const clarify = useClarifyInterview();
  const retryStart = useStartInterview();

  const [showClarifyEdit, setShowClarifyEdit] = useState(false);
  const [clarifyError, setClarifyError] = useState<string | null>(null);

  const activeTab = parsePrepTab(searchParams.get('tab'));

  function setTab(tab: PrepTab) {
    router.replace(`/interview/${profileId}?tab=${tab}`, { scroll: false });
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.hash === '#likely-questions') {
      router.replace(`/interview/${profileId}?tab=questions`, { scroll: false });
    }
  }, [profileId, router]);

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

  const questionCount = prepQuestionsData?.questions?.length ?? 0;
  const topicsDone = topics.filter((t) => (t.status as string) === 'done').length;
  const completedQuizzes = quiz_attempts.filter((a) => a.completed_at);
  const lastQuizScore = completedQuizzes[0]?.score as number | undefined;
  const completedMocks = sessions.filter((s) => s.status === 'completed');

  const quizStatus = in_progress_quiz
    ? 'In progress'
    : lastQuizScore != null
      ? `Last: ${lastQuizScore}%`
      : 'Not started';
  const mockStatus =
    completedMocks.length > 0
      ? `${completedMocks.length} completed`
      : sessions.some((s) => s.status === 'active')
        ? 'In progress'
        : 'Not started';

  const blueprint = profile.blueprint_json as {
    interview_strategy?: {
      duration_minutes?: number;
      question_count?: number;
      difficulty?: string;
    };
  } | null;

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
        setTab('questions');
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
    <div className="mx-auto max-w-4xl space-y-4">
      <Link
        href="/interview"
        className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-primary)]"
      >
        <ArrowLeft className="h-4 w-4" /> Interview prep
      </Link>

      {!isReady ? (
        <PageHeader
          title={profile.job_title ?? 'Interview prep'}
          subtitle={profile.company_name ?? undefined}
          actions={
            <>
              <ProfileStatusBadge status={profile.status} analyzing={isAnalyzing} />
              <DeleteInterviewProfileButton profileId={profileId} label="Delete" redirectTo="/interview" />
            </>
          }
        />
      ) : null}

      {isAnalyzing ? (
        <Card className="border-[var(--color-warning)]/30 bg-[var(--color-accent-gold)]/8 p-4 text-sm">
          <p className="font-medium text-[var(--color-text-primary)]">
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
        <Card className="border-[var(--color-danger)]/30 bg-[var(--color-accent-coral)]/8 p-4">
          <p className="text-sm font-medium text-[var(--color-danger)]">Analysis failed.</p>
          <Button
            className="mt-3"
            size="sm"
            variant="primary"
            loading={retryStart.isPending}
            onClick={() => void handleRetry()}
          >
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
              you&apos;ll get likely interview questions with suggested answers.
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
        <>
          <PrepProgressHero
            readiness={readiness}
            jobTitle={profile.job_title ?? 'Interview prep'}
            companyName={profile.company_name ?? undefined}
            actions={
              <>
                <ProfileStatusBadge status={profile.status} analyzing={isAnalyzing} />
                <DeleteInterviewProfileButton profileId={profileId} label="Delete" redirectTo="/interview" />
              </>
            }
            nav={
              <PrepActionNav
                activeTab={activeTab}
                onTabChange={setTab}
                topicsDone={topicsDone}
                topicsTotal={topics.length}
                questionCount={questionCount}
                quizStatus={quizStatus}
                mockStatus={mockStatus}
              />
            }
          />

          {clarification?.answers && Object.keys(clarification.answers).length > 0 ? (
            <PrepContextDisclosure
              questions={clarification.questions ?? []}
              answers={clarification.answers}
              showEdit={showClarifyEdit}
              onEdit={() => setShowClarifyEdit(true)}
              onCancelEdit={() => setShowClarifyEdit(false)}
            >
              {clarification.questions?.length ? (
                <ClarificationForm
                  questions={clarification.questions}
                  initialAnswers={clarification.answers}
                  onSubmit={(a) => void handleClarify(a)}
                  loading={clarify.isPending}
                />
              ) : null}
            </PrepContextDisclosure>
          ) : null}

          <PrepTabPanel tab={activeTab}>
            {activeTab === 'topics' ? (
              <PrepTopicsPanel
                profileId={profileId}
                topics={topics}
                plan={plan}
                isReady={isReady}
                generating={prepare.isPending}
                onGenerateTopics={() => handlePrepare(Boolean(plan))}
              />
            ) : null}
            {activeTab === 'questions' ? (
              <PrepQuestionList
                profileId={profileId}
                profileReady={isReady}
                profileStatus={profile.status}
              />
            ) : null}
            {activeTab === 'quiz' ? (
              <PrepQuizPanel
                profileId={profileId}
                quizAttempts={quiz_attempts}
                inProgressQuiz={in_progress_quiz}
                isReady={isReady}
                generating={quiz.isPending}
                onNewQuiz={handleNewQuiz}
                onResumeQuiz={() => void handleResumeQuiz()}
              />
            ) : null}
            {activeTab === 'mock' ? (
              <PrepMockPanel
                profileId={profileId}
                isReady={isReady}
                sessions={sessions}
                blueprint={blueprint}
              />
            ) : null}
          </PrepTabPanel>
        </>
      ) : null}
    </div>
  );
}
