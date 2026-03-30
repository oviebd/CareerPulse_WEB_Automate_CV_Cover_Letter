import {
  PRICING,
  type PricingPlanKey,
  type Profile,
  type SubscriptionTier,
} from '@/types';

/**
 * When NODE_ENV is development and NEXT_PUBLIC_DEV_SUBSCRIPTION_PLAN is set to a
 * valid PRICING key (e.g. premium_yearly), APIs and the client profile behave as
 * that plan without changing Supabase. Remove the env var to test real tiers.
 */
export function getDevSubscriptionOverride():
  | {
      tier: SubscriptionTier;
      status: Profile['subscription_status'];
      expiresAt: string;
    }
  | null {
  if (process.env.NODE_ENV !== 'development') return null;
  const raw = process.env.NEXT_PUBLIC_DEV_SUBSCRIPTION_PLAN?.trim();
  if (!raw) return null;
  const plan = raw as PricingPlanKey;
  if (!(plan in PRICING)) return null;
  const pricing = PRICING[plan];
  const expires = new Date();
  expires.setDate(expires.getDate() + pricing.days);
  return {
    tier: pricing.tier,
    status: 'active',
    expiresAt: expires.toISOString(),
  };
}

export function resolveEffectiveTier(
  dbTier: string | null | undefined
): SubscriptionTier {
  const o = getDevSubscriptionOverride();
  if (o) return o.tier;
  return (dbTier ?? 'free') as SubscriptionTier;
}

export function applyDevSubscriptionOverride(profile: Profile | null): Profile | null {
  const o = getDevSubscriptionOverride();
  if (!o || !profile) return profile;
  return {
    ...profile,
    subscription_tier: o.tier,
    subscription_status: o.status,
    subscription_expires_at: o.expiresAt,
  };
}
