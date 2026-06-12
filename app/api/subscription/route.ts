import { NextResponse } from 'next/server';
import { getDevSubscriptionOverride, resolveEffectiveTier } from '@/lib/dev-subscription';
import { createClient } from '@/lib/supabase/server';
import { countTailoredApplicationsThisMonth } from '@/lib/subscription';
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
    const { data: profile, error } = await supabase
      .from('profiles')
      .select(
        'subscription_tier, subscription_status, subscription_expires_at, email'
      )
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: 'profile_not_found' }, { status: 404 });
    }
    const dev = getDevSubscriptionOverride();
    const tier = resolveEffectiveTier(profile.subscription_tier);
    const used = await countTailoredApplicationsThisMonth(user.id, supabase);
    const limit = TIER_LIMITS[tier].generationsPerMonth;
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
