import type { PromoCode } from '@/types';

export type PromoValidationResult =
  | { ok: true }
  | { ok: false; reason: 'invalid' | 'inactive' | 'expired' | 'limit_reached' | 'already_used' };

export function validatePromoRedemption(
  promo: PromoCode | null,
  opts: { alreadyUsedCode?: string | null; now?: Date } = {}
): PromoValidationResult {
  if (!promo) return { ok: false, reason: 'invalid' };
  if (!promo.is_active) return { ok: false, reason: 'inactive' };

  const now = opts.now ?? new Date();
  if (promo.expires_at && new Date(promo.expires_at) < now) {
    return { ok: false, reason: 'expired' };
  }

  if (promo.max_redemptions != null && promo.redemption_count >= promo.max_redemptions) {
    return { ok: false, reason: 'limit_reached' };
  }

  if (opts.alreadyUsedCode && opts.alreadyUsedCode === promo.code) {
    return { ok: false, reason: 'already_used' };
  }

  return { ok: true };
}
