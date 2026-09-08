'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { useSubscription } from '@/hooks/useSubscription';
import { useStartInterview } from '@/hooks/useInterview';
import { invalidateCreditQueries } from '@/hooks/useCredits';
import { ApiError } from '@/lib/api-fetch';
import { jobStatusToColumn } from '@/lib/job-status-ui';
import type { JobStatus } from '@/types/database';

function interviewErrorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === 'CV_NOT_FOUND') {
      return 'Create a CV in Documents before starting interview preparation.';
    }
    if (e.code === 'JOB_CONTEXT_INSUFFICIENT') {
      return 'Add a job description from Interview Preparation — this role needs more context.';
    }
    return e.message;
  }
  return 'Could not start interview preparation. Please try again.';
}

export function ContextualAITools({
  jobId,
  status,
  jobSummary,
}: {
  jobId: string;
  status: JobStatus;
  jobSummary?: string | null;
}) {
  const { tier, limits } = useSubscription();
  const router = useRouter();
  const { toast } = useToast();
  const start = useStartInterview();
  const queryClient = useQueryClient();
  const column = jobStatusToColumn(status);
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [tool, setTool] = useState<'cold' | null>(null);

  const summaryLength = (jobSummary ?? '').trim().length;
  const needsJobContext = summaryLength < 80;

  if (!limits.aiExtrasAccess && tier === 'free') {
    return (
      <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 p-4 text-sm dark:bg-amber-950/20">
        <p className="font-medium text-amber-950 dark:text-amber-100">
          Interview prep & follow-up emails are Pro features.
        </p>
        <Link
          href="/settings/billing"
          className="mt-2 inline-block text-xs font-semibold text-[var(--color-primary)]"
        >
          Upgrade to Pro →
        </Link>
      </div>
    );
  }

  async function runColdEmail() {
    setTool('cold');
    setLoading(true);
    setOutput('');
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'cold_email',
          payload: { context: jobSummary ?? 'Application follow-up.' },
        }),
      });
      const data = (await res.json()) as { result?: unknown; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setOutput(
        typeof data.result === 'string'
          ? data.result
          : JSON.stringify(data.result, null, 2)
      );
      invalidateCreditQueries(queryClient);
    } catch {
      setOutput('Could not generate. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function prepareInterview() {
    if (needsJobContext) {
      toast(
        'Open Interview Preparation and use Prepare on this job to paste the job description.',
        'error'
      );
      router.push('/interview');
      return;
    }
    try {
      const result = await start.mutateAsync({ job_id: jobId });
      const profileId = result.profile?.id;
      if (profileId) {
        toast('Interview preparation started.', 'success');
        router.push(`/interview/${profileId}`);
      }
    } catch (e) {
      const message = interviewErrorMessage(e);
      toast(message, 'error');
      setOutput(message);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-faint)]/50 p-4">
      <p className="text-sm font-semibold text-[var(--color-text-primary)]">AI tools</p>
      <div className="flex flex-wrap gap-2">
        {column === 'applied' || column === 'interview' || column === 'assessment' ? (
          <Button
            size="sm"
            variant="secondary"
            loading={loading && tool === 'cold'}
            onClick={() => void runColdEmail()}
          >
            Follow-up email
          </Button>
        ) : null}
        {limits.interviewPrep ? (
          <Button
            size="sm"
            variant="primary"
            loading={start.isPending}
            onClick={() => void prepareInterview()}
          >
            Prepare for interview
          </Button>
        ) : null}
      </div>
      {output ? (
        <Textarea readOnly value={output} rows={8} className="text-sm" />
      ) : null}
    </div>
  );
}
