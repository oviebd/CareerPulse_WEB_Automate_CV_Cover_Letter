import { getDevSubscriptionOverride } from '@/lib/dev-subscription';
import { normalizeSubscriptionTier, type Profile, type SubscriptionStatus, type SubscriptionTier } from '@/types';

const PREMIUM_STATUSES: ReadonlySet<SubscriptionStatus> = new Set([
  'active',
  'trialing',
  'past_due',
]);

export function hasPremiumAccess(profile: Profile | null | undefined): boolean {
  if (!profile) return false;
  if (getDevSubscriptionOverride()) return true;
  if (normalizeSubscriptionTier(profile.subscription_tier) !== 'pro') return false;

  const status = profile.subscription_status;
  if (PREMIUM_STATUSES.has(status)) return true;

  if (status === 'cancelled') {
    if (!profile.subscription_expires_at) return false;
    return new Date(profile.subscription_expires_at).getTime() > Date.now();
  }

  return false;
}

export function effectiveAccessTier(profile: Profile | null | undefined): SubscriptionTier {
  return hasPremiumAccess(profile) ? 'pro' : 'free';
}
