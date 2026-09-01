import { TIER_LIMITS, type SubscriptionTier } from '@/types';
import { getCvsRepo } from '@/lib/db/repositories/cvs';

/** Server-only: count tailored CVs created this month. */
export async function countTailoredApplicationsThisMonth(userId: string): Promise<number> {
  return getCvsRepo().countTailoredThisMonth(userId);
}

export async function assertGenerationAllowed(
  userId: string,
  tier: SubscriptionTier
): Promise<void> {
  const limit = TIER_LIMITS[tier].generationsPerMonth;
  if (limit === Number.POSITIVE_INFINITY) return;

  const used = await countTailoredApplicationsThisMonth(userId);
  if (used >= limit) {
    throw new Error(`GENERATION_LIMIT_REACHED:${tier}:${limit}`);
  }
}
