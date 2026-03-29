'use client';

import Link from 'next/link';
import type { SubscriptionTier } from '@/types';
import { canUseTemplate } from '@/lib/subscription';

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

export function TemplateGate({
  availableTiers,
  userTier,
  children,
  lockedOverlay,
}: {
  availableTiers: SubscriptionTier[];
  userTier: SubscriptionTier;
  children: React.ReactNode;
  lockedOverlay?: React.ReactNode;
}) {
  if (canUseTemplate(availableTiers, userTier)) return <>{children}</>;
  return (
    <div className="relative">
      <div className="pointer-events-none opacity-40">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/70 p-4">
        {lockedOverlay ?? (
          <Link
            href="/settings/billing"
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white"
          >
            Upgrade
          </Link>
        )}
      </div>
    </div>
  );
}
