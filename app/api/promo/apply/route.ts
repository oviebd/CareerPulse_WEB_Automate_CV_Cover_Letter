import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

const VALID_PROMO_CODE = '2468';
const PROMO_DAYS = 30;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as { code?: string };
    const code = typeof body.code === 'string' ? body.code.trim() : '';

    if (code !== VALID_PROMO_CODE) {
      return NextResponse.json({ error: 'Invalid promo code.' }, { status: 400 });
    }

    const admin = createAdminClient();

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + PROMO_DAYS);

    const { error: updateErr } = await admin
      .from('profiles')
      .update({
        subscription_tier: 'pro',
        subscription_status: 'active',
        subscription_expires_at: expiresAt.toISOString(),
        promo_code_used: VALID_PROMO_CODE,
      })
      .eq('id', user.id);

    if (updateErr) {
      console.error('promo profile update', updateErr);
      return NextResponse.json({ error: 'Failed to apply promo code.' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (e) {
    console.error('promo apply', e);
    return NextResponse.json({ error: 'Unexpected error.' }, { status: 500 });
  }
}
