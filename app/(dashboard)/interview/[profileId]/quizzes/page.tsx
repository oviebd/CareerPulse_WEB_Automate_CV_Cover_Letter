'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useInterviewProfile } from '@/hooks/useInterview';

function formatDate(value: unknown) {
  if (!value || typeof value !== 'string') return '—';
  return new Date(value).toLocaleString();
}

export default function QuizHistoryPage() {
  const params = useParams();
  const profileId = typeof params.profileId === 'string' ? params.profileId : '';
  const { data, isLoading } = useInterviewProfile(profileId);

  if (isLoading || !data) {
    return <Skeleton className="mx-auto h-64 max-w-4xl rounded-xl" />;
  }

  const attempts = data.quiz_attempts;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href={`/interview/${profileId}`}
        className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-primary)]"
      >
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>

      <PageHeader title="Quiz history" subtitle="All quizzes for this interview profile" />

      <Card>
        {attempts.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--color-muted)]">No quizzes yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {attempts.map((a) => (
              <li key={a.id as string} className="flex items-center justify-between gap-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-[var(--color-text-primary)]">{a.quiz_title as string}</p>
                  <p className="text-xs text-[var(--color-muted)]">{formatDate(a.started_at)}</p>
                </div>
                {a.completed_at ? (
                  <Link
                    href={`/interview/${profileId}/quiz/${a.quiz_id as string}/review/${a.id as string}`}
                    className="font-semibold text-[var(--color-primary)]"
                  >
                    {a.score as number}% →
                  </Link>
                ) : (
                  <Link
                    href={`/interview/${profileId}/quiz/${a.quiz_id as string}`}
                    className="font-semibold text-[var(--color-primary)]"
                  >
                    Resume →
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
