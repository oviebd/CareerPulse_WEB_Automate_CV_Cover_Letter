'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { UpgradeCTA } from '@/components/shared/UpgradeCTA';
import { useCVProfile } from '@/hooks/useCV';
import { useJobApplications } from '@/hooks/useTracker';
import { useSubscription } from '@/hooks/useSubscription';
import { TIER_LIMITS } from '@/types';
import { useQuery } from '@tanstack/react-query';

export function HomeSidebar() {
  const { tier } = useSubscription();
  const { data: cv, isLoading: cvLoading } = useCVProfile();
  const { data: apps = [] } = useJobApplications();

  const { data: usage } = useQuery({
    queryKey: ['subscription-usage'],
    queryFn: async () => {
      const res = await fetch('/api/subscription');
      if (!res.ok) return null;
      return res.json() as Promise<{
        usage: { used: number; limit: number | null; remaining: number | null };
      }>;
    },
    staleTime: 60_000,
  });

  const tailoredCount = useMemo(
    () => apps.filter((a) => (a.cvs?.length ?? 0) > 0).length,
    [apps]
  );

  const genLimit = TIER_LIMITS[tier].generationsPerMonth;
  const used = usage?.usage?.used ?? 0;

  return (
    <aside className="flex flex-col gap-4">
      <Card padding="sm">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
          Base CV Health
        </h3>
        {cvLoading ? (
          <div className="mt-3 h-2 animate-pulse rounded bg-[var(--color-border)]" />
        ) : cv ? (
          <>
            <div className="mt-3 flex items-center gap-2">
              <Progress value={cv.completion_percentage} className="flex-1" />
              <span className="text-sm font-medium">{cv.completion_percentage}%</span>
            </div>
            <Link
              href="/cv/edit"
              className="mt-3 inline-block text-xs font-semibold text-[var(--color-primary)]"
            >
              Edit CV →
            </Link>
          </>
        ) : (
          <p className="mt-2 text-xs text-[var(--color-muted)]">
            <Link href="/cv/upload" className="text-[var(--color-primary)]">
              Upload a CV
            </Link>{' '}
            to get started.
          </p>
        )}
      </Card>

      <Card padding="sm">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
          ATS Readiness
        </h3>
        <p className="mt-2 text-2xl font-bold text-[var(--color-text-primary)]">
          {tailoredCount > 0 ? tailoredCount : '—'}
        </p>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          {tailoredCount > 0
            ? 'Applications with tailored CVs'
            : 'Tailor a CV to see ATS insights'}
        </p>
      </Card>

      <Card padding="sm">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
          Monthly Usage
        </h3>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Tailored applications:{' '}
          <strong className="text-[var(--color-text-primary)]">
            {used}
            {genLimit === Number.POSITIVE_INFINITY ? '' : ` / ${genLimit}`}
          </strong>
        </p>
        {tier === 'free' ? (
          <div className="mt-3">
            <UpgradeCTA />
          </div>
        ) : null}
      </Card>
    </aside>
  );
}
