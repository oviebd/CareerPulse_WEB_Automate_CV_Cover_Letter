'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/shared/PageHeader';
import { TopicPrepWizard } from '@/components/interview/TopicPrepWizard';
import { useSubscription } from '@/hooks/useSubscription';

export default function InterviewTopicNewPage() {
  const { limits } = useSubscription();

  if (!limits.interviewPrep) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader
          title="Prepare by topic"
          subtitle="Build skills and practice interviews on any topic"
        />
        <div className="rounded-xl border border-[var(--color-warning)]/30 bg-[var(--color-accent-gold)]/8 p-6 text-sm">
          <p className="font-medium text-[var(--color-text-primary)]">
            Interview preparation is a Pro feature.
          </p>
          <Link
            href="/settings/billing"
            className="mt-3 inline-block text-sm font-semibold text-[var(--color-primary)]"
          >
            Upgrade to Pro →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Prepare by topic"
        subtitle="Enter a topic and your expertise goals — no CV or job application required"
      />
      <TopicPrepWizard />
    </div>
  );
}
