'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useSubscription } from '@/hooks/useSubscription';
import { jobStatusToColumn } from '@/lib/job-status-ui';
import type { JobStatus } from '@/types/database';
import Link from 'next/link';

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
  const column = jobStatusToColumn(status);
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [tool, setTool] = useState<'cold' | 'interview' | null>(null);

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

  async function run(type: 'cold_email' | 'interview_questions') {
    setTool(type === 'cold_email' ? 'cold' : 'interview');
    setLoading(true);
    setOutput('');
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: type,
          payload:
            type === 'cold_email'
              ? { context: jobSummary ?? 'Application follow-up.' }
              : { jobDescription: jobSummary ?? 'Role context unavailable.' },
        }),
      });
      const data = (await res.json()) as { result?: unknown; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setOutput(
        typeof data.result === 'string'
          ? data.result
          : JSON.stringify(data.result, null, 2)
      );
    } catch {
      setOutput('Could not generate. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-faint)]/50 p-4">
      <p className="text-sm font-semibold text-[var(--color-text-primary)]">AI tools</p>
      <div className="flex flex-wrap gap-2">
        {column === 'applied' || column === 'interviewing' ? (
          <Button
            size="sm"
            variant="secondary"
            loading={loading && tool === 'cold'}
            onClick={() => void run('cold_email')}
          >
            Follow-up email
          </Button>
        ) : null}
        {column === 'interviewing' && limits.interviewPrep ? (
          <Button
            size="sm"
            variant="secondary"
            loading={loading && tool === 'interview'}
            onClick={() => void run('interview_questions')}
          >
            Interview prep
          </Button>
        ) : null}
      </div>
      {output ? (
        <Textarea readOnly value={output} rows={8} className="text-sm" />
      ) : null}
    </div>
  );
}
