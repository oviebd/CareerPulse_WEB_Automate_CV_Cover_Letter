import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { resolveEffectiveTier } from '@/lib/dev-subscription';
import { canAccessFeature } from '@/lib/subscription';
import { rateLimitHit } from '@/lib/rate-limit';
import { getProfilesRepo } from '@/lib/db/repositories/profiles';

export const runtime = 'nodejs';

export async function requireInterviewAccess(userId: string) {
  const profile = await getProfilesRepo().getById(userId);
  const tier = resolveEffectiveTier(profile?.subscription_tier);
  if (!canAccessFeature(tier, 'interviewPrep')) {
    return NextResponse.json(
      {
        error: 'UPGRADE_REQUIRED',
        message: 'Interview preparation requires a Pro plan.',
        upgrade_url: '/settings/billing',
      },
      { status: 403 }
    );
  }
  if (rateLimitHit(`interview:${userId}`)) {
    return NextResponse.json({ error: 'RATE_LIMIT' }, { status: 429 });
  }
  return null;
}

export function err(msg: string, status: number, code?: string) {
  return NextResponse.json({ error: msg, code }, { status });
}
