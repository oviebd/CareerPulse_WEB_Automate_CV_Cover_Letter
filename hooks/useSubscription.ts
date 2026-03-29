'use client';

import { useAuthStore } from '@/stores/useAuthStore';
import { TIER_LIMITS, type SubscriptionTier } from '@/types';

export function useSubscription() {
  const profile = useAuthStore((s) => s.profile);
  const tier: SubscriptionTier = profile?.subscription_tier ?? 'free';
  return {
    tier,
    status: profile?.subscription_status ?? 'inactive',
    expiresAt: profile?.subscription_expires_at ?? null,
    limits: TIER_LIMITS[tier],
    profile,
  };
}
