import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { rateLimitHit } from '@/lib/rate-limit';
import { assertFeatureAccess, FeatureDisabledError, featureDisabledMessage } from '@/lib/access/user-permissions';
import { Feature } from '@/lib/access/feature-flags';
import { getProfilesRepo } from '@/lib/db/repositories/profiles';
import { hasPremiumAccess } from '@/lib/access/premium';

export const runtime = 'nodejs';

/** Authenticated users may use interview prep; AI credits are enforced in claudeComplete. */
export async function requireInterviewAccess(userId: string) {
  try {
    await assertFeatureAccess(userId, Feature.INTERVIEW_PREPARATION);
  } catch (err) {
    if (err instanceof FeatureDisabledError) {
      return NextResponse.json(
        { error: featureDisabledMessage(Feature.INTERVIEW_PREPARATION), code: 'FEATURE_DISABLED' },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const profile = await getProfilesRepo().getById(userId);
  if (!hasPremiumAccess(profile)) {
    return NextResponse.json(
      { error: 'Interview prep is available on Pro.', code: 'PRO_REQUIRED' },
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

export async function requireAuthenticatedUser() {
  const user = await getSessionUser();
  if (!user) return null;
  return user;
}
