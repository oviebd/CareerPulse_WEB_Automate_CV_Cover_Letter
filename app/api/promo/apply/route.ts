import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getProfilesRepo } from '@/lib/db/repositories/profiles';

const VALID_PROMO_CODE = '2468';

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as { code?: string };
    const code = typeof body.code === 'string' ? body.code.trim() : '';

    if (code !== VALID_PROMO_CODE) {
      return NextResponse.json({ error: 'Invalid promo code.' }, { status: 400 });
    }

    try {
      await getProfilesRepo().update(user.id, {
        subscription_tier: 'pro',
        subscription_status: 'active',
        subscription_expires_at: null,
        promo_code_used: VALID_PROMO_CODE,
      });
    } catch (updateErr) {
      console.error('promo profile update', updateErr);
      return NextResponse.json({ error: 'Failed to apply promo code.' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      expiresAt: null,
    });
  } catch (e) {
    console.error('promo apply', e);
    return NextResponse.json({ error: 'Unexpected error.' }, { status: 500 });
  }
}
