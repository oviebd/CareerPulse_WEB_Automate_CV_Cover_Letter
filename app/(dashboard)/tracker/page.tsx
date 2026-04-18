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
      <div className="flex gap-3 overflow-hidden animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-64 w-64 shrink-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-faint)]"
          />
        ))}
      </div>
    ),
  }
);

export default function TrackerPage() {
  const { tier } = useSubscription();
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
        Job Tracker
      </h1>
      <FeatureGate
        requiredTier={['pro', 'premium', 'career']}
        userTier={tier}
        fallback={<UpgradeCTA />}
      >
        <TrackerBoard />
      </FeatureGate>
    </div>
  );
}
