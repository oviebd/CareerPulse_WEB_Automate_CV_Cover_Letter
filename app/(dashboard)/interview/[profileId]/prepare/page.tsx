'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useInterviewProfile, useUpdateTopic } from '@/hooks/useInterview';
import { PrepQuestionList } from '@/components/interview/PrepQuestionList';
import type { PreparationPlanOutput } from '@/types/interview';

export default function InterviewPreparePage() {
  const params = useParams();
  const profileId = typeof params.profileId === 'string' ? params.profileId : '';
  const { data, isLoading } = useInterviewProfile(profileId);
  const updateTopic = useUpdateTopic(profileId);

  if (isLoading || !data) {
    return <Skeleton className="mx-auto h-64 max-w-4xl rounded-xl" />;
  }

  const { plan, topics } = data;
  const planJson = (plan?.plan_json ?? null) as PreparationPlanOutput | null;
  const profileReady = data.profile.status === 'ready' && Boolean(data.profile.blueprint_json);
  const topicCount = topics.length || planJson?.topics?.length || 0;

  async function toggleTopic(topicId: string, current: string) {
    const next = current === 'done' ? 'pending' : 'done';
    await updateTopic.mutateAsync({ topicId, status: next });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href={`/interview/${profileId}`}
        className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-primary)]"
      >
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>

      <PageHeader
        title={(plan?.title as string) ?? 'Preparation topics'}
        subtitle={
          topicCount > 0
            ? `${topicCount} focus topic${topicCount === 1 ? '' : 's'} for this interview`
            : 'Your preparation topics'
        }
      />

      <PrepQuestionList
        profileId={profileId}
        profileReady={profileReady}
        profileStatus={data.profile.status}
      />

      <div className="space-y-3">
        {topics.map((t) => {
          const status = (t.status as string) ?? 'pending';
          const priority = (t.priority as number) ?? '—';
          return (
            <Card key={t.id as string} padding="sm">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-[var(--color-text-primary)]">{t.name as string}</p>
                    {status === 'done' ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-950/40 dark:text-green-300">
                        Done
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs text-[var(--color-muted)]">Priority {priority}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-2"
                    loading={updateTopic.isPending}
                    onClick={() => void toggleTopic(t.id as string, status)}
                  >
                    Mark as {status === 'done' ? 'pending' : 'done'}
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
        {topics.length === 0 ? (
          <Card className="py-8 text-center text-sm text-[var(--color-muted)]">
            No topics yet. Generate a preparation plan from the dashboard.
          </Card>
        ) : null}
      </div>
    </div>
  );
}
