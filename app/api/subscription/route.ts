import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getDevSubscriptionOverride, resolveEffectiveTier } from '@/lib/dev-subscription';
import { getProfilesRepo } from '@/lib/db/repositories/profiles';
import { countTailoredApplicationsThisMonth } from '@/lib/subscription-server';
import { TIER_LIMITS } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    const profile = await getProfilesRepo().getById(user.id);
    if (!profile) {
      return NextResponse.json({ error: 'profile_not_found' }, { status: 404 });
    }
    const dev = getDevSubscriptionOverride();
    const tier = resolveEffectiveTier(profile.subscription_tier);
    const used = await countTailoredApplicationsThisMonth(user.id);
    const limit = TIER_LIMITS[tier].generationsPerMonth;
    const remaining =
      limit === Number.POSITIVE_INFINITY ? null : Math.max(0, limit - used);

    return NextResponse.json({
      tier,
      status: dev?.status ?? profile.subscription_status,
      expiresAt: dev?.expiresAt ?? profile.subscription_expires_at,
      usage: { used, limit: limit === Number.POSITIVE_INFINITY ? null : limit, remaining },
    });
  } catch (e) {
    console.error('subscription GET', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
