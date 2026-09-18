'use client';

import { PageHeader } from '@/components/shared/PageHeader';
import { InterviewStartWizard } from '@/components/interview/InterviewStartWizard';

export default function InterviewNewPage() {
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
