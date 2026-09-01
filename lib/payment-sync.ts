import { PRICING, type PricingPlanKey } from '@/types';
import { getPaymentsRepo } from '@/lib/db/repositories/payments';
import { getProfilesRepo } from '@/lib/db/repositories/profiles';

export async function applySuccessfulPayment(params: {
  tran_id: string;
  val_id: string | null;
  gateway_response: Record<string, unknown>;
}): Promise<{ ok: boolean; reason?: string }> {
  const payment = (await getPaymentsRepo().getByTranId(params.tran_id)) as {
    status?: string;
    plan?: string;
    amount?: string | number;
    user_id?: string;
  } | null;

  if (!payment) {
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

  const updated = await getPaymentsRepo().updateByTranId(params.tran_id, {
    status: 'success',
    val_id: params.val_id,
    gateway_response: params.gateway_response,
    billing_period_start: now,
    billing_period_end: end,
  });
  if (!updated) {
    return { ok: false, reason: 'update_failed' };
  }

  if (!payment.user_id) {
    return { ok: false, reason: 'profile_update_failed' };
  }

  await getProfilesRepo().update(payment.user_id, {
    subscription_tier: pricing.tier,
    subscription_status: 'active',
    subscription_expires_at: end.toISOString(),
  });

  return { ok: true };
}
