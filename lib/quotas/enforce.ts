import { hasPremiumAccess } from '@/lib/access/premium';
import { effectiveAccessTier } from '@/lib/access/premium';
import { getProfilesRepo } from '@/lib/db/repositories/profiles';
import { getQuotasRepo } from '@/lib/db/repositories/quotas';
import {
  quotaLimitFor,
  quotaPeriodKind,
  type QuotaMetric,
  QUOTA_METRICS,
} from '@/lib/quotas/catalog';
import { QuotaExceededError } from '@/lib/quotas/errors';
import { periodKeyFor } from '@/lib/quotas/period';
import type { SubscriptionTier } from '@/types';

export type QuotaRemaining = {
  metric: QuotaMetric;
  limit: number;
  used: number;
  bonus: number;
  remaining: number;
  period_key: string;
};

function effectiveLimit(tier: SubscriptionTier, metric: QuotaMetric, bonus: number): number {
  return quotaLimitFor(tier, metric) + Math.max(0, bonus);
}

export async function resolveUserTier(userId: string): Promise<SubscriptionTier> {
  const profile = await getProfilesRepo().getById(userId);
  return effectiveAccessTier(profile);
}

export async function getQuotaRemaining(
  userId: string,
  metric: QuotaMetric,
  tier?: SubscriptionTier
): Promise<QuotaRemaining> {
  const t = tier ?? (await resolveUserTier(userId));
  const kind = quotaPeriodKind(t, metric);
  const periodKey = periodKeyFor(kind);
  const row = await getQuotasRepo().getRow(userId, metric, periodKey);
  const used = row?.used ?? 0;
  const bonus = row?.bonus ?? 0;
  const limit = effectiveLimit(t, metric, bonus);
  const remaining = Math.max(0, limit - used);
  return { metric, limit, used, bonus, remaining, period_key: periodKey };
}

export async function getAllQuotaRemaining(userId: string): Promise<QuotaRemaining[]> {
  const tier = await resolveUserTier(userId);
  const results: QuotaRemaining[] = [];
  for (const metric of QUOTA_METRICS) {
    results.push(await getQuotaRemaining(userId, metric, tier));
  }
  return results;
}

/** Call before starting a billable action. */
export async function assertQuotaAvailable(userId: string, metric: QuotaMetric): Promise<void> {
  const remaining = await getQuotaRemaining(userId, metric);
  if (remaining.remaining <= 0) {
    throw new QuotaExceededError(
      metric,
      remaining.limit,
      remaining.used,
      remaining.remaining
    );
  }
}

/** Call after a successful action completes. */
export async function consumeQuota(userId: string, metric: QuotaMetric, delta = 1): Promise<void> {
  const tier = await resolveUserTier(userId);
  const kind = quotaPeriodKind(tier, metric);
  const periodKey = periodKeyFor(kind);
  await getQuotasRepo().incrementUsed(userId, metric, periodKey, delta);
}

export async function grantQuotaBonus(
  userId: string,
  metric: QuotaMetric,
  amount: number,
  opts?: { tier?: SubscriptionTier; periodKey?: string }
): Promise<void> {
  const tier = opts?.tier ?? (await resolveUserTier(userId));
  const kind = quotaPeriodKind(tier, metric);
  const periodKey = opts?.periodKey ?? periodKeyFor(kind);
  await getQuotasRepo().addBonus(userId, metric, periodKey, amount);
}

export { hasPremiumAccess };
