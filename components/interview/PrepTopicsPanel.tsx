'use client';

import { BookOpen, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUpdateTopic } from '@/hooks/useInterview';

type Props = {
  profileId: string;
  topics: Record<string, unknown>[];
  plan: Record<string, unknown> | null;
  isReady: boolean;
  onGenerateTopics: () => Promise<void>;
  generating?: boolean;
};

export function PrepTopicsPanel({
  profileId,
  topics,
  plan,
  isReady,
  onGenerateTopics,
  generating,
}: Props) {
  const updateTopic = useUpdateTopic(profileId);

  async function toggleTopic(topicId: string, current: string) {
    const next = current === 'done' ? 'pending' : 'done';
    await updateTopic.mutateAsync({ topicId, status: next });
  }

  if (!plan && topics.length === 0) {
    return (
      <Card className="space-y-4 py-10 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-primary-100)] text-[var(--color-primary)]">
          <BookOpen className="h-6 w-6" />
        </div>
        <div>
          <p className="font-semibold text-[var(--color-text-primary)]">No topics yet</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Generate a preparation plan tailored to this role.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          loading={generating}
          disabled={!isReady}
          onClick={() => void onGenerateTopics()}
        >
          Generate topics
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
            {(plan?.title as string) ?? 'Preparation topics'}
          </h3>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            {topics.length} focus area{topics.length === 1 ? '' : 's'} for this interview
          </p>
        </div>
        {plan ? (
          <Button
            size="sm"
            variant="ghost"
            loading={generating}
            icon={<RefreshCw className="h-3.5 w-3.5" />}
            disabled={!isReady}
            onClick={() => void onGenerateTopics()}
          >
            Regenerate
          </Button>
        ) : null}
      </div>

      <div className="space-y-3">
        {topics.map((t) => {
          const status = (t.status as string) ?? 'pending';
          const priority = (t.priority as number) ?? '—';
          const done = status === 'done';
          return (
            <Card
              key={t.id as string}
              padding="sm"
              hoverable
              className={
                done
                  ? 'border-[var(--color-accent-mint)]/25 bg-[var(--color-accent-mint)]/5'
                  : undefined
              }
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-[var(--color-text-primary)]">
                      {t.name as string}
                    </p>
                    {done ? (
                      <Badge variant="success">Done</Badge>
                    ) : (
                      <Badge variant="default">Pending</Badge>
                    )}
                    <Badge variant="info">Priority {priority}</Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-2"
                    loading={updateTopic.isPending}
                    onClick={() => void toggleTopic(t.id as string, status)}
                  >
                    Mark as {done ? 'pending' : 'done'}
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
