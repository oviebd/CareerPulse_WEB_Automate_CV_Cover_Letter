'use client';

import dynamic from 'next/dynamic';
import { FeatureGate } from '@/components/shared/FeatureGate';
import { UpgradeCTA } from '@/components/shared/UpgradeCTA';
import { useSubscription } from '@/hooks/useSubscription';

const TrackerBoard = dynamic(
  () =>
    import('@/components/tracker/TrackerBoard').then((m) => m.TrackerBoard),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto w-full max-w-[1000px] animate-pulse space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="h-8 w-48 rounded-lg bg-[var(--color-surface-faint)]" />
          <div className="flex gap-2">
            <div className="h-9 w-24 rounded-lg bg-[var(--color-surface-faint)]" />
            <div className="h-9 w-32 rounded-lg bg-[var(--color-surface-faint)]" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 w-20 rounded-full bg-[var(--color-surface-faint)]" />
          ))}
        </div>
        <div className="rounded-2xl border border-[var(--color-border)]/60 bg-[var(--color-surface-faint)] p-4 sm:p-6">
          <div className="flex flex-col gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 w-full rounded-xl bg-[var(--color-surface-faint)]" />
            ))}
          </div>
        </div>
      </div>
    ),
  }
);

export default function TrackerPage() {
  const { tier } = useSubscription();
  return (
    <div className="mx-auto w-full max-w-[1000px]">
      <FeatureGate
        requiredTier={['pro', 'premium', 'career']}
        userTier={tier}
        fallback={
          <div className="space-y-4">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
              Job Tracker
            </h1>
            <UpgradeCTA />
          </div>
        }
      >
        <TrackerBoard />
      </FeatureGate>
    </div>
  );
}
