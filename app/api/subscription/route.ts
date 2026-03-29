import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TIER_LIMITS, type SubscriptionTier } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createClient();
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
    const tier = profile.subscription_tier as SubscriptionTier;
    const startOfPeriod = new Date();
    startOfPeriod.setDate(1);
    startOfPeriod.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from('cover_letters')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', startOfPeriod.toISOString());
    const limit = TIER_LIMITS[tier].generationsPerMonth;
    const used = count ?? 0;
    const remaining =
      limit === Number.POSITIVE_INFINITY
        ? null
        : Math.max(0, limit - used);

    return NextResponse.json({
      tier,
      status: profile.subscription_status,
      expiresAt: profile.subscription_expires_at,
      usage: { used, limit: limit === Number.POSITIVE_INFINITY ? null : limit, remaining },
    });
  } catch (e) {
    console.error('subscription GET', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
