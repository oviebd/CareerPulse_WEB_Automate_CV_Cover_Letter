'use client';

import { PageHeader } from '@/components/shared/PageHeader';
import { TopicPrepWizard } from '@/components/interview/TopicPrepWizard';

export default function InterviewTopicNewPage() {
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
