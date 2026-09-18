import type { SubscriptionTier } from '@/types';

export type QuotaMetric = 'tailored_cv' | 'cover_letter' | 'interview_profile' | 'rewrite';

export const QUOTA_METRICS: QuotaMetric[] = [
  'tailored_cv',
  'cover_letter',
  'interview_profile',
  'rewrite',
];

type QuotaLimitDef = {
  free: { limit: number; period: 'lifetime' | 'monthly' };
  pro: { limit: number; period: 'lifetime' | 'monthly' };
};

export const QUOTA_LIMITS: Record<QuotaMetric, QuotaLimitDef> = {
  tailored_cv: {
    free: { limit: 1, period: 'lifetime' },
    pro: { limit: 15, period: 'monthly' },
  },
  cover_letter: {
    free: { limit: 1, period: 'lifetime' },
    pro: { limit: 15, period: 'monthly' },
  },
  interview_profile: {
    free: { limit: 0, period: 'lifetime' },
    pro: { limit: 3, period: 'monthly' },
  },
  rewrite: {
    free: { limit: 5, period: 'lifetime' },
    pro: { limit: 40, period: 'monthly' },
  },
};

export function quotaLimitFor(tier: SubscriptionTier, metric: QuotaMetric): number {
  return QUOTA_LIMITS[metric][tier].limit;
}

export function quotaPeriodKind(tier: SubscriptionTier, metric: QuotaMetric): 'lifetime' | 'monthly' {
  return QUOTA_LIMITS[metric][tier].period;
}
