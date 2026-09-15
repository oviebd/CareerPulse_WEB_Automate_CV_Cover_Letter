'use client';

import { useMemo } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { effectiveAccessTier, hasPremiumAccess } from '@/lib/access/premium';
import { TIER_LIMITS, type SubscriptionTier } from '@/types';

export function useSubscription() {
  const profile = useAuthStore((s) => s.profile);
  return useMemo(() => {
    const tier: SubscriptionTier = effectiveAccessTier(profile);
    return {
      tier,
      isPremium: hasPremiumAccess(profile),
      billedTier: profile?.subscription_tier ?? 'free',
      status: profile?.subscription_status ?? 'inactive',
      expiresAt: profile?.subscription_expires_at ?? null,
      limits: TIER_LIMITS[tier],
      profile,
    };
  }, [profile]);
}
