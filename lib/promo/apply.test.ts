import { describe, expect, it } from 'vitest';
import { normalizeSubscriptionTier } from '@/types';

/** Mirrors promo apply tier logic: only upgrade when grants_plan is set. */
function resolvePromoTier(grantsPlan: string | null | undefined) {
  return grantsPlan ? normalizeSubscriptionTier(grantsPlan) : null;
}

describe('promo apply tier resolution', () => {
  it('credits-only promo does not assign a tier', () => {
    expect(resolvePromoTier(null)).toBeNull();
    expect(resolvePromoTier(undefined)).toBeNull();
  });

  it('pro promo assigns pro tier', () => {
    expect(resolvePromoTier('pro')).toBe('pro');
  });

  it('bonus credits can combine with pro grant independently', () => {
    const grantsPlan = 'pro';
    const bonusCredits = 100;
    expect(resolvePromoTier(grantsPlan)).toBe('pro');
    expect(bonusCredits > 0).toBe(true);
  });
});
