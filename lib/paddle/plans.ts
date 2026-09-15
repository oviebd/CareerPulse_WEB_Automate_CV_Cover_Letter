import { getPaddleServerConfig } from '@/lib/config/paddle';
import { BillingError } from '@/lib/paddle/errors';
import { PRICING, type PricingPlanKey } from '@/types';

export type PaidPlan = 'pro';
export type BillingInterval = 'monthly' | 'yearly';

export function isPaidPlan(value: string): value is PaidPlan {
  return value === 'pro';
}

export function isBillingInterval(value: string): value is BillingInterval {
  return value === 'monthly' || value === 'yearly';
}

export function planKeyFor(plan: PaidPlan, interval: BillingInterval): PricingPlanKey {
  return `${plan}_${interval}`;
}

export function resolvePaddlePriceId(plan: string, billingInterval: string): {
  planKey: PricingPlanKey;
  priceId: string;
  interval: BillingInterval;
} {
  if (!isPaidPlan(plan) || !isBillingInterval(billingInterval)) {
    throw new BillingError('invalid_plan', 'That plan is not available.');
  }
  const planKey = planKeyFor(plan, billingInterval);
  if (!(planKey in PRICING)) {
    throw new BillingError('invalid_plan', 'That plan is not available.');
  }
  const priceId = getPaddleServerConfig().priceIds[planKey];
  if (!priceId) {
    throw new BillingError('not_configured', 'Billing is not configured yet.', 503);
  }
  return { planKey, priceId, interval: billingInterval };
}

export function planKeyFromPriceId(priceId: string | null | undefined): PricingPlanKey | null {
  if (!priceId) return null;
  const { priceIds } = getPaddleServerConfig();
  if (priceId === priceIds.pro_monthly) return 'pro_monthly';
  if (priceId === priceIds.pro_yearly) return 'pro_yearly';
  return null;
}

export function intervalFromPlanKey(planKey: PricingPlanKey | null): BillingInterval | null {
  if (planKey === 'pro_monthly') return 'monthly';
  if (planKey === 'pro_yearly') return 'yearly';
  return null;
}
