import { describe, expect, it } from 'vitest';
import { validatePromoRedemption } from '@/lib/promo/validate';
import type { PromoCode } from '@/types';

const basePromo: PromoCode = {
  id: 'p1',
  code: '2468',
  is_active: true,
  max_redemptions: null,
  redemption_count: 0,
  grants_plan: 'pro',
  bonus_credits: 0,
  expires_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('validatePromoRedemption', () => {
  it('accepts active promo with no limits', () => {
    expect(validatePromoRedemption(basePromo)).toEqual({ ok: true });
  });

  it('rejects missing promo', () => {
    expect(validatePromoRedemption(null)).toEqual({ ok: false, reason: 'invalid' });
  });

  it('rejects inactive promo', () => {
    expect(
      validatePromoRedemption({ ...basePromo, is_active: false })
    ).toEqual({ ok: false, reason: 'inactive' });
  });

  it('rejects expired promo', () => {
    expect(
      validatePromoRedemption(
        { ...basePromo, expires_at: '2020-01-01T00:00:00.000Z' },
        { now: new Date('2025-01-01') }
      )
    ).toEqual({ ok: false, reason: 'expired' });
  });

  it('rejects when redemption limit reached', () => {
    expect(
      validatePromoRedemption({ ...basePromo, max_redemptions: 5, redemption_count: 5 })
    ).toEqual({ ok: false, reason: 'limit_reached' });
  });

  it('rejects duplicate use by same user', () => {
    expect(
      validatePromoRedemption(basePromo, { alreadyUsedCode: '2468' })
    ).toEqual({ ok: false, reason: 'already_used' });
  });
});
