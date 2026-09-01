import {
  TIER_LIMITS,
  normalizeSubscriptionTier,
  type SubscriptionTier,
} from '@/types';

export { normalizeSubscriptionTier };

export function canAccessFeature(
  tier: SubscriptionTier,
  feature: keyof (typeof TIER_LIMITS)[SubscriptionTier]
): boolean {
  return Boolean(TIER_LIMITS[tier][feature]);
}

export function canUseTemplate(
  templateAvailableTiers: string[],
  userTier: SubscriptionTier
): boolean {
  const normalized = templateAvailableTiers.map((t) => normalizeSubscriptionTier(t));
  return normalized.includes(userTier);
}
