'use client';

import Link from 'next/link';
import type { SubscriptionTier } from '@/types';

interface FeatureGateProps {
  requiredTier: SubscriptionTier[];
  userTier: SubscriptionTier;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function FeatureGate({
  requiredTier,
  userTier,
  fallback,
  children,
}: FeatureGateProps) {
  const allowed = requiredTier.includes(userTier);
  if (allowed) return <>{children}</>;
  return (
    <>
      {fallback ?? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-medium">Upgrade to unlock</p>
          <p className="mt-1 text-amber-900/80">
            This feature requires a higher plan.
          </p>
          <Link
            href="/settings/billing"
            className="mt-3 inline-block font-semibold text-[var(--color-primary)] hover:underline"
          >
            View plans
          </Link>
        </div>
      )}
    </>
  );
}

/** @deprecated Prefer visible controls + useRequirePremium; pass-through for layout compatibility. */
export function TemplateGate({
  children,
}: {
  availableTiers?: SubscriptionTier[];
  userTier?: SubscriptionTier;
  children: React.ReactNode;
  lockedOverlay?: React.ReactNode;
}) {
  return <>{children}</>;
}
