'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageSquare, Plus } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { PrepareJobModal } from '@/components/interview/PrepareJobModal';
import { DeleteInterviewProfileButton } from '@/components/interview/DeleteInterviewProfileButton';
import { useInterviewDashboard, useStartInterview } from '@/hooks/useInterview';
import { useSubscription } from '@/hooks/useSubscription';
import { ApiError } from '@/lib/api-fetch';
import {
  jobStatusToColumn,
  KANBAN_COLUMN_CONFIG,
} from '@/lib/job-status-ui';
import type { EligibleInterviewJob } from '@/types/interview';
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

function StatusBadge({ status }: { status: JobStatus }) {
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Interview Preparation"
          subtitle="Prepare for interviews from your tracked applications or add a new role"
        />
        {limits.interviewPrep ? (
          <Link href="/interview/new">
            <Button variant="primary" size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              Start new preparation
            </Button>
          </Link>
        ) : (
          <Link href="/settings/billing">
            <Button variant="secondary" size="sm">
              Upgrade for interview prep
            </Button>
          </Link>
        )}
      </div>

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
                    <Card hoverable className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-[var(--color-text-primary)]">
                          {p.job_title ?? 'Role'}
                        </p>
                        <p className="text-sm text-[var(--color-muted)]">
                          {p.company_name ?? 'Company'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-[var(--color-primary)]">
                          {p.readiness_score ?? '—'}%
                        </p>
                        <p className="text-xs capitalize text-[var(--color-muted)]">{p.status}</p>
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
                      <StatusBadge status={job.status} />
                    </div>
                    <p className="text-sm text-[var(--color-muted)]">{job.company_name}</p>
                    {job.needs_job_context ? (
                      <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
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
            {start.isPending ? 'Building plan…' : 'Prepare'}
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
                Start by adding job details and your CV—we&apos;ll build a personalized prep plan.
              </p>
              {limits.interviewPrep ? (
                <Link href="/interview/new" className="mt-4 inline-block">
                  <Button variant="primary">Start new preparation</Button>
                </Link>
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
