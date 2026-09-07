import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getProfilesRepo } from '@/lib/db/repositories/profiles';
import { getPromoRepo } from '@/lib/db/repositories/promo';
import { getCreditsRepo } from '@/lib/db/repositories/credits';
import { validatePromoRedemption } from '@/lib/promo/validate';
import { normalizeSubscriptionTier } from '@/types';

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as { code?: string };
    const code = typeof body.code === 'string' ? body.code.trim() : '';
    if (!code) {
      return NextResponse.json({ error: 'Invalid promo code.' }, { status: 400 });
    }

    const promo = await getPromoRepo().findByCode(code);
    const profile = await getProfilesRepo().getById(user.id);
    const validation = validatePromoRedemption(promo, {
      alreadyUsedCode: profile?.promo_code_used,
    });
    if (!validation.ok) {
      const messages: Record<typeof validation.reason, string> = {
        invalid: 'Invalid promo code.',
        inactive: 'Invalid promo code.',
        expired: 'This promo code has expired.',
        limit_reached: 'This promo code has reached its limit.',
        already_used: 'You have already used this promo code.',
      };
      return NextResponse.json({ error: messages[validation.reason] }, { status: 400 });
    }

    const activePromo = promo!;

    if (activePromo.grants_plan) {
      const tier = normalizeSubscriptionTier(activePromo.grants_plan);
      await getProfilesRepo().update(user.id, {
        subscription_tier: tier,
        subscription_status: 'active',
        subscription_expires_at: null,
        promo_code_used: activePromo.code,
      });
    } else {
      await getProfilesRepo().update(user.id, {
        promo_code_used: activePromo.code,
      });
    }

    if (activePromo.bonus_credits > 0) {
      await getCreditsRepo().grantCredits({
        userId: user.id,
        amount: activePromo.bonus_credits,
        type: 'promo_grant',
        description: `Promo code ${activePromo.code}`,
        source: 'promo',
        referenceId: activePromo.id,
      });
    }

    await getPromoRepo().redeem(activePromo.id);

    const tier = activePromo.grants_plan
      ? normalizeSubscriptionTier(activePromo.grants_plan)
      : null;

    return NextResponse.json({ ok: true, tier, expiresAt: null });
  } catch (e) {
    console.error('promo apply', e);
    return NextResponse.json({ error: 'Unexpected error.' }, { status: 500 });
  }
}
