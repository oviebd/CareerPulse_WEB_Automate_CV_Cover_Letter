'use client';

import { FeatureGate } from '@/components/shared/FeatureGate';
import { UpgradeCTA } from '@/components/shared/UpgradeCTA';
import { TrackerBoard } from '@/components/tracker/TrackerBoard';
import { useSubscription } from '@/hooks/useSubscription';

export default function TrackerPage() {
  const { tier } = useSubscription();
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Application tracker</h1>
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
