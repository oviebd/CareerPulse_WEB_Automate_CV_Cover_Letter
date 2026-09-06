'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, Briefcase, MessageSquare, Plus } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/toast';
import { PrepareJobModal } from '@/components/interview/PrepareJobModal';
import { DeleteInterviewProfileButton } from '@/components/interview/DeleteInterviewProfileButton';
import { useInterviewDashboard, useStartInterview } from '@/hooks/useInterview';
import { useSubscription } from '@/hooks/useSubscription';
import { ApiError } from '@/lib/api-fetch';
import { AiWorkingOverlay } from '@/components/shared/AiWorkingOverlay';
import { isTopicPrepProfile } from '@/lib/interview/topic-config';
import {
  jobStatusToColumn,
  KANBAN_COLUMN_CONFIG,
} from '@/lib/job-status-ui';
import type { EligibleInterviewJob, InterviewProfile } from '@/types/interview';
import type { JobStatus } from '@/types/database';

function interviewErrorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === 'CV_NOT_FOUND') {
      return 'Create a CV in Documents before starting interview preparation.';
    }
    return e.message;
  }
  return 'Could not start interview preparation. Please try again.';
}

function ProfileStatusChip({ status }: { status: string }) {
  if (status === 'ready') return <Badge variant="info">Ready</Badge>;
  if (status === 'analyzing') return <Badge variant="warning">Analyzing</Badge>;
  if (status === 'failed') return <Badge variant="danger">Failed</Badge>;
  if (status === 'needs_clarification') return <Badge variant="info">Setup needed</Badge>;
  return <Badge variant="default">{status}</Badge>;
}

function PrepSourceBadge({ profile }: { profile: InterviewProfile }) {
  if (isTopicPrepProfile(profile)) {
    return <Badge variant="default">Topic</Badge>;
  }
  return <Badge variant="default">Job</Badge>;
}

function JobStatusBadge({ status }: { status: JobStatus }) {
  const column = jobStatusToColumn(status);
  if (!column) return null;
  const config = KANBAN_COLUMN_CONFIG[column];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.bgColor} ${config.textColor}`}
    >
      {config.emoji} {config.label}
    </span>
  );
}

export default function InterviewListPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { limits } = useSubscription();
  const { data, isLoading } = useInterviewDashboard();
  const start = useStartInterview();

  const profiles = data?.profiles ?? [];
  const eligibleJobs = data?.eligible_jobs ?? [];

  const [modalJob, setModalJob] = useState<EligibleInterviewJob | null>(null);

  async function runStart(body: Parameters<typeof start.mutateAsync>[0]) {
    try {
      const result = await start.mutateAsync(body);
      setModalJob(null);
      const profileId = result.profile?.id;
      if (profileId) {
        toast('Interview preparation started.', 'success');
        router.push(`/interview/${profileId}`);
      }
    } catch (e) {
      toast(interviewErrorMessage(e), 'error');
    }
  }

  function handlePrepare(job: EligibleInterviewJob) {
    if (!job.has_cv) {
      toast('Create a CV in Documents before starting interview preparation.', 'error');
      return;
    }
    if (job.needs_job_context) {
      setModalJob(job);
      return;
    }
    void runStart({ job_id: job.id });
  }

  const showEmpty = !isLoading && profiles.length === 0 && eligibleJobs.length === 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <AiWorkingOverlay
        open={start.isPending}
        title="Finding topics to practice"
        messages={[
          'Reading the job and your CV…',
          'AI is building your prep topic list…',
          'Organizing focus areas for you…',
        ]}
      />
      <PageHeader
        title="Interview Preparation"
        subtitle="Prepare for a specific job or build skills by topic"
      />

      {limits.interviewPrep ? (
        <section className="grid gap-3 sm:grid-cols-2">
          <Link href="/interview/new">
            <Card hoverable className="flex h-full flex-col gap-3 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary-100)]">
                <Briefcase className="h-5 w-5 text-[var(--color-primary)]" />
              </div>
              <div>
                <p className="font-semibold text-[var(--color-text-primary)]">Prepare for a job</p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  Match your CV to a role and get tailored interview prep
                </p>
              </div>
            </Card>
          </Link>
          <Link href="/interview/new/topic">
            <Card hoverable className="flex h-full flex-col gap-3 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary-100)]">
                <BookOpen className="h-5 w-5 text-[var(--color-primary)]" />
              </div>
              <div>
                <p className="font-semibold text-[var(--color-text-primary)]">Prepare by topic</p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  Choose topics and goals — no CV or job application needed
                </p>
              </div>
            </Card>
          </Link>
        </section>
      ) : (
        <Card className="p-4 text-center">
          <Link href="/settings/billing">
            <Button variant="secondary" size="sm">
              Upgrade for interview prep
            </Button>
          </Link>
        </Card>
      )}

      {isLoading ? (
        <Skeleton className="h-32 rounded-xl" />
      ) : (
        <>
          {profiles.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                Active preparations
              </h2>
              {profiles.map((p) => (
                <div key={p.id} className="flex items-stretch gap-2">
                  <Link href={`/interview/${p.id}`} className="min-w-0 flex-1">
                    <Card hoverable className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-[var(--color-text-primary)]">
                            {p.job_title ?? 'Preparation'}
                          </p>
                          <PrepSourceBadge profile={p} />
                          <ProfileStatusChip status={p.status} />
                        </div>
                        <p className="text-sm text-[var(--color-muted)]">
                          {p.company_name ?? (isTopicPrepProfile(p) ? 'Topic-based' : 'Company')}
                        </p>
                        {typeof p.readiness_score === 'number' ? (
                          <Progress value={p.readiness_score} className="mt-2 h-1.5" />
                        ) : null}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-display text-2xl font-bold tabular-nums text-[var(--color-primary)]">
                          {p.readiness_score ?? '—'}%
                        </p>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                          Progress
                        </p>
                      </div>
                    </Card>
                  </Link>
                  <div className="flex items-center">
                    <DeleteInterviewProfileButton profileId={p.id} />
                  </div>
                </div>
              ))}
            </section>
          ) : null}

          {eligibleJobs.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                From your applications
              </h2>
              {eligibleJobs.map((job) => (
                <Card key={job.id} className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-[var(--color-text-primary)]">
                        {job.job_title}
                      </p>
                      <JobStatusBadge status={job.status} />
                    </div>
                    <p className="text-sm text-[var(--color-muted)]">{job.company_name}</p>
                    {job.needs_job_context ? (
                      <p className="mt-1 text-xs text-[var(--color-warning)]">
                        Job description needed for best results
                      </p>
                    ) : null}
                  </div>
                  {limits.interviewPrep ? (
                    <Button
                      size="sm"
                      variant="primary"
                      loading={start.isPending}
                      onClick={() => void handlePrepare(job)}
                    >
                      {start.isPending ? 'Finding topics…' : 'Prepare'}
                    </Button>
                  ) : null}
                </Card>
              ))}
            </section>
          ) : null}

          {showEmpty ? (
            <Card className="py-12 text-center">
              <MessageSquare className="mx-auto h-10 w-10 text-[var(--color-muted)]" />
              <p className="mt-3 font-medium text-[var(--color-text-primary)]">
                No interview preparations yet
              </p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                Start with a job from your applications or prepare by topic above.
              </p>
              {limits.interviewPrep ? (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Link href="/interview/new">
                    <Button variant="primary">
                      <Plus className="mr-1.5 h-4 w-4" />
                      Job preparation
                    </Button>
                  </Link>
                  <Link href="/interview/new/topic">
                    <Button variant="secondary">Topic preparation</Button>
                  </Link>
                </div>
              ) : (
                <Link
                  href="/settings/billing"
                  className="mt-4 inline-block text-sm font-semibold text-[var(--color-primary)]"
                >
                  Upgrade to Pro →
                </Link>
              )}
            </Card>
          ) : null}
        </>
      )}

      <PrepareJobModal
        job={modalJob}
        isOpen={Boolean(modalJob)}
        loading={start.isPending}
        onClose={() => setModalJob(null)}
        onSubmit={(payload) => void runStart(payload)}
      />
    </div>
  );
}
