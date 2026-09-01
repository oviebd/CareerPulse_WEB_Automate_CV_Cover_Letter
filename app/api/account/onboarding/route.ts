import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getProfilesRepo } from '@/lib/db/repositories/profiles';
import { applyDevSubscriptionOverride } from '@/lib/dev-subscription';

export async function PATCH() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const data = await getProfilesRepo().update(user.id, { is_onboarded: true });
    return NextResponse.json(applyDevSubscriptionOverride(data));
  } catch (e) {
    console.error('account onboarding PATCH', e);
    return NextResponse.json({ error: 'Failed to complete onboarding' }, { status: 500 });
  }
}
