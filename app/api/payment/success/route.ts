import { NextResponse } from 'next/server';
import { applySuccessfulPayment } from '@/lib/payment-sync';
import { validatePayment, verifyCallbackSignature } from '@/lib/sslcommerz';
import { sendPaymentReceiptEmail } from '@/lib/resend-mail';
import { createAdminClient } from '@/lib/supabase/server';

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';

function pick(
  data: Record<string, string>,
  keys: string[]
): string | undefined {
  for (const k of keys) {
    const v = data[k];
    if (v) return v;
  }
  return undefined;
}

export async function POST(request: Request) {
  return handlePaymentReturn(request);
}

export async function GET(request: Request) {
  return handlePaymentReturn(request);
}

async function handlePaymentReturn(request: Request) {
  try {
    let callbackData: Record<string, string> = {};
    let tran_id: string | undefined;
    let val_id: string | undefined;
    const contentType = request.headers.get('content-type') ?? '';

    if (contentType.includes('application/json')) {
      const j = (await request.json()) as Record<string, string>;
      callbackData = j;
      tran_id = pick(j, ['tran_id', 'tranId']);
      val_id = pick(j, ['val_id', 'valId']);
    } else if (
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data')
    ) {
      const form = await request.formData();
      callbackData = Object.fromEntries(
        Array.from(form.entries()).map(([k, v]) => [k, String(v)])
      );
      tran_id =
        pick(
          callbackData,
          ['tran_id']
        ) ?? undefined;
      val_id =
        pick(
          callbackData,
          ['val_id']
        ) ?? undefined;
    } else {
      const url = new URL(request.url);
      callbackData = Object.fromEntries(url.searchParams.entries());
      tran_id = url.searchParams.get('tran_id') ?? undefined;
      val_id = url.searchParams.get('val_id') ?? undefined;
    }

    if (!tran_id || !val_id) {
      return NextResponse.redirect(new URL('/settings/billing?payment=invalid', appUrl));
    }

    if (!verifyCallbackSignature(callbackData)) {
      console.error('payment success signature verification failed', tran_id);
      return NextResponse.redirect(new URL('/settings/billing?payment=invalid', appUrl));
    }

    const valid = await validatePayment(val_id);
    if (!valid) {
      return NextResponse.redirect(new URL('/settings/billing?payment=invalid', appUrl));
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
      gateway_response: { val_id, source: 'success_redirect' },
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

    return NextResponse.redirect(new URL('/dashboard?payment=success', appUrl));
  } catch (e) {
    console.error('payment success', e);
    return NextResponse.redirect(new URL('/settings/billing?payment=error', appUrl));
  }
}
