'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useInterviewSession } from '@/hooks/useInterview';
import type { FinalReport } from '@/types/interview';

export default function InterviewReportPage() {
  const params = useParams();
  const profileId = typeof params.profileId === 'string' ? params.profileId : '';
  const sessionId = typeof params.sessionId === 'string' ? params.sessionId : '';

  const { data, isLoading } = useInterviewSession(sessionId);

  if (isLoading || !data) {
    return <Skeleton className="mx-auto h-64 max-w-2xl rounded-xl" />;
  }

  const report = data.session.evaluation_json as FinalReport | null;
  const displayScore =
    report?.readiness_score ??
    (typeof data.session.overall_score === 'number' ? data.session.overall_score : null);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={`/interview/${profileId}`}
        className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-primary)]"
      >
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>

      <PageHeader title="Interview report" subtitle="Based on your CareerPulse practice performance" />

      <Card className="text-center">
        <p className="text-sm text-[var(--color-muted)]">Practice readiness</p>
        <p className="font-display text-4xl font-bold text-[var(--color-primary)]">
          {displayScore ?? '—'}%
        </p>
      </Card>

      {report?.dimensions?.length ? (
        <Card>
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Performance</h3>
          <ul className="mt-3 space-y-2">
            {report.dimensions.map((d) => (
              <li key={d.name} className="flex justify-between text-sm">
                <span className="text-[var(--color-text-secondary)]">{d.name}</span>
                <span className="font-medium">{d.score}/10</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {report?.strengths?.length ? (
        <Card>
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Strengths</h3>
          <ul className="mt-2 list-inside list-disc text-sm text-[var(--color-text-secondary)]">
            {report.strengths.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      {report?.weaknesses?.length ? (
        <Card>
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Areas to improve</h3>
          <ul className="mt-2 list-inside list-disc text-sm text-[var(--color-text-secondary)]">
            {report.weaknesses.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      {report?.recommendations?.length ? (
        <Card>
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Recommendations</h3>
          <ul className="mt-2 list-inside list-disc text-sm text-[var(--color-text-secondary)]">
            {report.recommendations.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="flex gap-2">
        <Link href={`/interview/${profileId}/lobby`}>
          <Button variant="primary">Try again</Button>
        </Link>
        <Link href={`/interview/${profileId}`}>
          <Button variant="secondary">Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
