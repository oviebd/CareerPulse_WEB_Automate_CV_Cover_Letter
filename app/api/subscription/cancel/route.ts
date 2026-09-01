import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getProfilesRepo } from '@/lib/db/repositories/profiles';

export async function POST() {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      await getProfilesRepo().update(user.id, {
        subscription_tier: 'free',
        subscription_status: 'inactive',
        subscription_expires_at: null,
      });
    } catch (error) {
      console.error('subscription cancel', error);
      return NextResponse.json({ error: 'Failed to cancel subscription.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('subscription cancel', e);
    return NextResponse.json({ error: 'Unexpected error.' }, { status: 500 });
  }
}
