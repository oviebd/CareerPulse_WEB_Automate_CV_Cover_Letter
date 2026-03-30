import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { initiatePayment } from '@/lib/sslcommerz';
import { PRICING, type PricingPlanKey } from '@/types';

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = (await request.json()) as { plan?: string };
    const plan = body.plan as PricingPlanKey;
    if (!plan || !(plan in PRICING)) {
      return NextResponse.json({ error: 'invalid_plan' }, { status: 400 });
    }

    const { data: profile, error: pErr } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', user.id)
      .single();
    if (pErr || !profile?.email) {
      return NextResponse.json({ error: 'profile_required' }, { status: 400 });
    }

    const pricing = PRICING[plan];
    const tran_id = `CV-${user.id.slice(0, 8)}-${Date.now()}`;
    const admin = createAdminClient();
    const { error: insErr } = await admin.from('payments').insert({
      user_id: user.id,
      tran_id,
      amount: pricing.amount,
      currency: 'USD',
      status: 'pending',
      plan,
    });
    if (insErr) {
      console.error('payment insert', insErr);
      return NextResponse.json({ error: 'payment_create_failed' }, { status: 500 });
    }

    let gatewayUrl: string;
    try {
      gatewayUrl = await initiatePayment({
        total_amount: pricing.amount,
        currency: 'USD',
        tran_id,
        success_url: `${appUrl}/api/payment/success`,
        fail_url: `${appUrl}/api/payment/fail`,
        cancel_url: `${appUrl}/api/payment/cancel`,
        cus_name: profile.full_name || profile.email.split('@')[0],
        cus_email: profile.email,
        cus_phone: '00000000000',
        product_name: `Subscription ${plan}`,
      });
    } catch (e) {
      console.error('SSLCommerz init', e);
      await admin.from('payments').delete().eq('tran_id', tran_id);
      return NextResponse.json({ error: 'gateway_init_failed' }, { status: 502 });
    }

    return NextResponse.json({ gatewayUrl });
  } catch (e) {
    console.error('payment initiate', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
