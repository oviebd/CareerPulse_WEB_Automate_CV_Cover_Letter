import { createAdminClient } from '@/lib/supabase/server';
import { PRICING, type PricingPlanKey } from '@/types';

export async function applySuccessfulPayment(params: {
  tran_id: string;
  val_id: string | null;
  gateway_response: Record<string, unknown>;
}): Promise<{ ok: boolean; reason?: string }> {
  const admin = createAdminClient();
  const { data: payment, error: fetchErr } = await admin
    .from('payments')
    .select('*')
    .eq('tran_id', params.tran_id)
    .maybeSingle();

  if (fetchErr || !payment) {
    return { ok: false, reason: 'payment_not_found' };
  }
  if (payment.status === 'success') {
    return { ok: true };
  }

  const planKey = payment.plan as PricingPlanKey;
  const pricing = PRICING[planKey];
  if (!pricing) {
    return { ok: false, reason: 'invalid_plan' };
  }

  const amountExpected = pricing.amount;
  if (Number(payment.amount) !== amountExpected) {
    console.error('Payment amount mismatch', payment.amount, amountExpected);
    return { ok: false, reason: 'amount_mismatch' };
  }

  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + pricing.days);

  const { error: payUp } = await admin
    .from('payments')
    .update({
      status: 'success',
      val_id: params.val_id,
      gateway_response: params.gateway_response,
      billing_period_start: now.toISOString(),
      billing_period_end: end.toISOString(),
    })
    .eq('tran_id', params.tran_id);

  if (payUp) {
    console.error('payment update', payUp);
    return { ok: false, reason: 'update_failed' };
  }

  const { error: profUp } = await admin
    .from('profiles')
    .update({
      subscription_tier: pricing.tier,
      subscription_status: 'active',
      subscription_expires_at: end.toISOString(),
    })
    .eq('id', payment.user_id);

  if (profUp) {
    console.error('profile update', profUp);
    return { ok: false, reason: 'profile_update_failed' };
  }

  return { ok: true };
}
