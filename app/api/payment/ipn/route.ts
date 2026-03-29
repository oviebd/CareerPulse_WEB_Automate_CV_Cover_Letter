import { NextResponse } from 'next/server';
import { applySuccessfulPayment } from '@/lib/payment-sync';
import { validatePayment } from '@/lib/sslcommerz';
import { createAdminClient } from '@/lib/supabase/server';
import { sendPaymentReceiptEmail } from '@/lib/resend-mail';

/**
 * SSLCommerz IPN — validate val_id server-side; idempotent via applySuccessfulPayment.
 * Add SSLCommerz hash verification against store password when you enable live IPN.
 */
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const data = Object.fromEntries(
      Array.from(form.entries()).map(([k, v]) => [k, String(v)])
    ) as Record<string, string>;

    const tran_id = data.tran_id;
    const val_id = data.val_id;
    const status = data.status;

    if (!tran_id || !val_id) {
      return NextResponse.json({ error: 'bad_request' }, { status: 400 });
    }

    if (status && status !== 'VALID' && status !== 'VALIDATED') {
      const admin = createAdminClient();
      await admin
        .from('payments')
        .update({ status: 'failed', gateway_response: data })
        .eq('tran_id', tran_id);
      return NextResponse.json({ ok: true });
    }

    const valid = await validatePayment(val_id);
    if (!valid) {
      console.error('IPN validation failed', tran_id);
      return NextResponse.json({ error: 'invalid' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: payment } = await admin
      .from('payments')
      .select('user_id, amount, plan')
      .eq('tran_id', tran_id)
      .maybeSingle();

    const result = await applySuccessfulPayment({
      tran_id,
      val_id,
      gateway_response: data,
    });

    if (result.ok && payment?.user_id) {
      const { data: prof } = await admin
        .from('profiles')
        .select('email')
        .eq('id', payment.user_id)
        .single();
      if (prof?.email) {
        await sendPaymentReceiptEmail({
          to: prof.email,
          plan: String(payment.plan),
          amount: String(payment.amount),
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('payment ipn', e);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
