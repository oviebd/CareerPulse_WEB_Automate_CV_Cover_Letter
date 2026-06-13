import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();

    const { error } = await admin
      .from('profiles')
      .update({
        subscription_tier: 'free',
        subscription_status: 'inactive',
        subscription_expires_at: null,
      })
      .eq('id', user.id);

    if (error) {
      console.error('subscription cancel', error);
      return NextResponse.json({ error: 'Failed to cancel subscription.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('subscription cancel', e);
    return NextResponse.json({ error: 'Unexpected error.' }, { status: 500 });
  }
}
