'use client';

import { useMemo } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { TIER_LIMITS, normalizeSubscriptionTier, type SubscriptionTier } from '@/types';

export function useSubscription() {
  const profile = useAuthStore((s) => s.profile);
  return useMemo(() => {
    const tier: SubscriptionTier = normalizeSubscriptionTier(
      profile?.subscription_tier
    );
    return {
      tier,
      status: profile?.subscription_status ?? 'inactive',
      expiresAt: profile?.subscription_expires_at ?? null,
      limits: TIER_LIMITS[tier],
      profile,
    };
  }, [profile]);
}
