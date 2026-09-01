import { NextResponse } from 'next/server';
import { applySuccessfulPayment } from '@/lib/payment-sync';
import { validatePayment, verifyCallbackSignature } from '@/lib/sslcommerz';
import { sendPaymentReceiptEmail } from '@/lib/resend-mail';
import { getPaymentsRepo } from '@/lib/db/repositories/payments';
import { getProfilesRepo } from '@/lib/db/repositories/profiles';

/**
 * SSLCommerz IPN — verify callback signature, then validate val_id server-side.
 * Idempotent updates are handled by applySuccessfulPayment.
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

    if (!verifyCallbackSignature(data)) {
      console.error('IPN signature verification failed', tran_id);
      return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
    }

    if (status && status !== 'VALID' && status !== 'VALIDATED') {
      await getPaymentsRepo().updateByTranId(tran_id, {
        status: 'failed',
        gateway_response: data,
      });
      return NextResponse.json({ ok: true });
    }

    const valid = await validatePayment(val_id);
    if (!valid) {
      console.error('IPN validation failed', tran_id);
      return NextResponse.json({ error: 'invalid' }, { status: 400 });
    }

    const payment = await getPaymentsRepo().getByTranId(tran_id);

    const result = await applySuccessfulPayment({
      tran_id,
      val_id,
      gateway_response: data,
    });

    const userId = payment?.user_id as string | undefined;
    if (result.ok && userId) {
      const prof = await getProfilesRepo().getById(userId);
      if (prof?.email) {
        await sendPaymentReceiptEmail({
          to: prof.email,
          plan: String(payment?.plan),
          amount: String(payment?.amount),
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('payment ipn', e);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
