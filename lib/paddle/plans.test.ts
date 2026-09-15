import { afterEach, describe, expect, it } from 'vitest';
import { BillingError } from '@/lib/paddle/errors';
import { planKeyFromPriceId, resolvePaddlePriceId } from '@/lib/paddle/plans';

describe('paddle plans', () => {
  const prev = { ...process.env };
  afterEach(() => {
    process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_MONTHLY = prev.NEXT_PUBLIC_PADDLE_PRICE_PRO_MONTHLY;
    process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_YEARLY = prev.NEXT_PUBLIC_PADDLE_PRICE_PRO_YEARLY;
  });

  it('maps pro monthly to configured price id', () => {
    process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_MONTHLY = 'pri_month';
    process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_YEARLY = 'pri_year';
    expect(resolvePaddlePriceId('pro', 'monthly')).toEqual({
      planKey: 'pro_monthly',
      priceId: 'pri_month',
      interval: 'monthly',
    });
  });

  it('rejects unknown plans', () => {
    expect(() => resolvePaddlePriceId('enterprise', 'monthly')).toThrow(BillingError);
    expect(() => resolvePaddlePriceId('pro', 'weekly')).toThrow(BillingError);
  });

  it('does not accept raw price ids as plan input', () => {
    process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_MONTHLY = 'pri_month';
    expect(() => resolvePaddlePriceId('pri_month', 'monthly')).toThrow(BillingError);
  });

  it('resolves plan key from configured price id only', () => {
    process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_MONTHLY = 'pri_month';
    process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_YEARLY = 'pri_year';
    expect(planKeyFromPriceId('pri_year')).toBe('pro_yearly');
    expect(planKeyFromPriceId('pri_other')).toBeNull();
  });
});
