import type { SupabaseClient } from '@supabase/supabase-js';
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

/** Count tailored applications (jobs with linked CVs) created this month */
export async function countTailoredApplicationsThisMonth(
  userId: string,
  supabase: SupabaseClient
): Promise<number> {
  const startOfPeriod = new Date();
  startOfPeriod.setDate(1);
  startOfPeriod.setHours(0, 0, 0, 0);

  const { data: tailoredCvs, error } = await supabase
    .from('cvs')
    .select('job_ids, created_at')
    .eq('user_id', userId)
    .gte('created_at', startOfPeriod.toISOString());

  if (error) throw new Error(error.message);

  const jobIds = new Set<string>();
  for (const row of tailoredCvs ?? []) {
    const ids = row.job_ids as string[] | null;
    if (ids && ids.length > 0) {
      for (const id of ids) jobIds.add(id);
    }
  }
  return jobIds.size;
}

export async function assertGenerationAllowed(
  userId: string,
  tier: SubscriptionTier,
  supabase: SupabaseClient
): Promise<void> {
  const limit = TIER_LIMITS[tier].generationsPerMonth;
  if (limit === Number.POSITIVE_INFINITY) return;

  const used = await countTailoredApplicationsThisMonth(userId, supabase);
  if (used >= limit) {
    throw new Error(`GENERATION_LIMIT_REACHED:${tier}:${limit}`);
  }
}
