import type { SupabaseClient } from '@supabase/supabase-js';
import {
  TIER_LIMITS,
  type SubscriptionTier,
} from '@/types';

export function canAccessFeature(
  tier: SubscriptionTier,
  feature: keyof (typeof TIER_LIMITS)[SubscriptionTier]
): boolean {
  return Boolean(TIER_LIMITS[tier][feature]);
}

export function canUseTemplate(
  templateAvailableTiers: SubscriptionTier[],
  userTier: SubscriptionTier
): boolean {
  return templateAvailableTiers.includes(userTier);
}

export async function assertGenerationAllowed(
  userId: string,
  tier: SubscriptionTier,
  supabase: SupabaseClient
): Promise<void> {
  const limit = TIER_LIMITS[tier].generationsPerMonth;
  if (limit === Number.POSITIVE_INFINITY) return;

  const startOfPeriod = new Date();
  startOfPeriod.setDate(1);
  startOfPeriod.setHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from('cover_letters')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startOfPeriod.toISOString());

  if (error) throw new Error(error.message);
  if ((count ?? 0) >= limit) {
    throw new Error(`GENERATION_LIMIT_REACHED:${tier}:${limit}`);
  }
}
