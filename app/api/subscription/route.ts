import { NextResponse } from 'next/server';
import { getDevSubscriptionOverride, resolveEffectiveTier } from '@/lib/dev-subscription';
import { createClient } from '@/lib/supabase/server';
import { TIER_LIMITS } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    const startOfPeriod = new Date();
    startOfPeriod.setDate(1);
    startOfPeriod.setHours(0, 0, 0, 0);

    const [profileResult, countResult] = await Promise.all([
      supabase
        .from('profiles')
        .select(
          'subscription_tier, subscription_status, subscription_expires_at, email'
        )
        .eq('id', user.id)
        .single(),
      supabase
        .from('cover_letters')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startOfPeriod.toISOString()),
    ]);

    const { data: profile, error } = profileResult;
    if (error || !profile) {
      return NextResponse.json({ error: 'profile_not_found' }, { status: 404 });
    }
    const dev = getDevSubscriptionOverride();
    const tier = resolveEffectiveTier(profile.subscription_tier);
    const { count } = countResult;
    const limit = TIER_LIMITS[tier].generationsPerMonth;
    const used = count ?? 0;
    const remaining =
      limit === Number.POSITIVE_INFINITY
        ? null
        : Math.max(0, limit - used);

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
