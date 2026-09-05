'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useInterviewProfile, useStartInterviewSession } from '@/hooks/useInterview';

export default function InterviewLobbyPage() {
  const params = useParams();
  const router = useRouter();
  const profileId = typeof params.profileId === 'string' ? params.profileId : '';
  const { data, isLoading } = useInterviewProfile(profileId);
  const start = useStartInterviewSession();

  const profile = data?.profile;
  const isReady = profile?.status === 'ready' && Boolean(profile.blueprint_json);

  const blueprint = profile?.blueprint_json as {
    interview_strategy?: { duration_minutes?: number; question_count?: number; difficulty?: string };
  } | null;

  const [mode, setMode] = useState<'practice' | 'realistic'>('practice');
  const [difficulty, setDifficulty] = useState(
    blueprint?.interview_strategy?.difficulty ?? 'job_level'
  );

  async function handleStart() {
    const result = await start.mutateAsync({
      profile_id: profileId,
      type: 'mock',
      mode,
      difficulty,
    });
    router.push(`/interview/${profileId}/session/${result.session.id}`);
  }

  if (isLoading) {
    return <Skeleton className="mx-auto h-64 max-w-lg rounded-xl" />;
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link
        href={`/interview/${profileId}`}
        className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-primary)]"
      >
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>

      <PageHeader title="Mock interview" subtitle="AI interviewer ready when you are" />

      {!isReady ? (
        <Card className="p-4 text-sm text-[var(--color-muted)]">
          Complete interview analysis on the dashboard before starting a mock interview.
        </Card>
      ) : (
        <Card className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">Mode</p>
            <div className="mt-2 flex gap-2">
              {(['practice', 'realistic'] as const).map((m) => (
                <Button
                  key={m}
                  size="sm"
                  variant={mode === m ? 'primary' : 'secondary'}
                  onClick={() => setMode(m)}
                >
                  {m === 'practice' ? 'Practice' : 'Realistic'}
                </Button>
              ))}
            </div>
            <p className="mt-2 text-xs text-[var(--color-muted)]">
              {mode === 'practice'
                ? 'Get feedback after each answer.'
                : 'Feedback only at the end.'}
            </p>
          </div>

          <div className="text-sm text-[var(--color-text-secondary)]">
            <p>Duration: ~{blueprint?.interview_strategy?.duration_minutes ?? 30} minutes</p>
            <p>Questions: ~{blueprint?.interview_strategy?.question_count ?? 10}</p>
          </div>

          <Button
            variant="primary"
            className="w-full"
            loading={start.isPending}
            onClick={() => void handleStart()}
          >
            Start interview
          </Button>
        </Card>
      )}
    </div>
  );
}
