'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/shared/PageHeader';
import { InterviewStartWizard } from '@/components/interview/InterviewStartWizard';
import { useSubscription } from '@/hooks/useSubscription';

export default function InterviewNewPage() {
  const { limits } = useSubscription();

  if (!limits.interviewPrep) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader
          title="Start interview preparation"
          subtitle="Personalized AI coaching for your next interview"
        />
        <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 p-6 text-sm dark:bg-amber-950/20">
          <p className="font-medium text-amber-950 dark:text-amber-100">
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
        title="Start interview preparation"
        subtitle="Add the role details and we'll analyze the job against your CV"
      />
      <InterviewStartWizard />
    </div>
  );
}
