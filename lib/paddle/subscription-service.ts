import { getProfilesRepo } from '@/lib/db/repositories/profiles';
import { getSubscriptionsRepo } from '@/lib/db/repositories/subscriptions';
import { assertPaddlePublicConfig, getPaddlePublicConfig } from '@/lib/config/paddle';
import { getPaddleClient } from '@/lib/paddle/client';
import { checkoutCustomData } from '@/lib/paddle/custom-data';
import { BillingError, paddleUserMessage } from '@/lib/paddle/errors';
import { paddleLog } from '@/lib/paddle/log';
import { wrapPaddle } from '@/lib/paddle/paddle-api';
import { planKeyFor, resolvePaddlePriceId } from '@/lib/paddle/plans';
import { resolvePackPriceId, type CreditPackKey } from '@/lib/paddle/packs';
import { packCheckoutCustomData } from '@/lib/paddle/custom-data';
import type { BillingSubscriptionDto } from '@/lib/paddle/types';
import type { PricingPlanKey } from '@/types';

export type CheckoutOpenPayload = {
  priceId: string;
  email: string;
  customerId: string | null;
  customData: Record<string, unknown>;
  environment: ReturnType<typeof getPaddlePublicConfig>['environment'];
};

const PADDLE_LIVE_STATUSES = new Set(['active', 'trialing', 'past_due', 'cancelled', 'paused']);

export async function createPackCheckoutPayload(
  user: { id: string; email: string },
  pack: CreditPackKey
) {
  const { packKey, priceId } = resolvePackPriceId(pack);
  assertPaddlePublicConfig();
  paddleLog('checkout_started', { userId: user.id, pack: packKey });
  const existing = await getSubscriptionsRepo().getByUserId(user.id);
  return {
    priceId,
    email: user.email,
    customerId: existing?.paddle_customer_id ?? null,
    customData: packCheckoutCustomData(user.id, packKey),
    environment: getPaddlePublicConfig().environment,
  };
}

export async function createCheckoutPayload(
  user: { id: string; email: string },
  plan: string,
  billingInterval: string
) {
  const { planKey, priceId } = resolvePaddlePriceId(plan, billingInterval);
  assertPaddlePublicConfig();
  const existing = await getSubscriptionsRepo().getByUserId(user.id);
  if (
    existing?.paddle_subscription_id &&
    (existing.status === 'active' || existing.status === 'trialing' || existing.status === 'past_due')
  ) {
    throw new BillingError('already_subscribed', 'You already have an active subscription.', 409);
  }

  paddleLog('checkout_started', { userId: user.id, plan: planKey });
  return {
    priceId,
    email: user.email,
    customerId: existing?.paddle_customer_id ?? null,
    customData: checkoutCustomData(user.id, planKey),
    environment: getPaddlePublicConfig().environment,
  };
}

export async function getBillingSubscription(userId: string): Promise<BillingSubscriptionDto> {
  const profile = await getProfilesRepo().getById(userId);
  const sub = await getSubscriptionsRepo().getByUserId(userId);
  const paddleLive = Boolean(sub?.paddle_subscription_id && PADDLE_LIVE_STATUSES.has(sub.status));
  const source: BillingSubscriptionDto['source'] = paddleLive
    ? 'paddle'
    : profile?.subscription_tier === 'pro'
      ? profile.promo_code_used
        ? 'promo'
        : 'admin'
      : 'none';
  const plan = (sub?.plan as PricingPlanKey | null) ?? 'free';
  const cancelAtPeriodEnd = Boolean(sub?.cancel_at_period_end);
  return {
    plan: plan === 'pro_monthly' || plan === 'pro_yearly' ? plan : 'free',
    tier: profile?.subscription_tier === 'pro' ? 'pro' : 'free',
    status: profile?.subscription_status ?? 'inactive',
    billingInterval: (sub?.billing_interval as 'monthly' | 'yearly' | null) ?? null,
    currentPeriodEnd: sub?.current_period_end ?? profile?.subscription_expires_at ?? null,
    cancelAtPeriodEnd,
    source,
    canChangePlan: source === 'paddle' && !cancelAtPeriodEnd && !sub?.scheduled_change,
    canManageBilling: Boolean(sub?.paddle_customer_id && sub.paddle_subscription_id),
  };
}

export async function cancelUserSubscription(userId: string) {
  const sub = await getSubscriptionsRepo().getByUserId(userId);
  if (sub?.paddle_subscription_id && sub.status !== 'cancelled' && sub.status !== 'inactive') {
    await wrapPaddle(() =>
      getPaddleClient().subscriptions.cancel(sub.paddle_subscription_id!, {
        effectiveFrom: 'next_billing_period',
      })
    );
    paddleLog('subscription_canceled', { userId, mode: 'period_end' });
    const profile = await getProfilesRepo().getById(userId);
    if (profile && profile.subscription_tier === 'pro') {
      await getProfilesRepo().update(userId, {
        subscription_status: 'cancelled',
        subscription_expires_at: sub.current_period_end ?? profile.subscription_expires_at,
      });
    }
    return {
      mode: 'period_end' as const,
      currentPeriodEnd: sub.current_period_end,
    };
  }

  await getProfilesRepo().update(userId, {
    subscription_tier: 'free',
    subscription_status: 'inactive',
    subscription_expires_at: null,
  });
  paddleLog('subscription_canceled', { userId, mode: 'immediate' });
  return { mode: 'immediate' as const, currentPeriodEnd: null };
}

export async function changeUserPlan(userId: string, plan: string, billingInterval: string) {
  const { priceId, planKey } = resolvePaddlePriceId(plan, billingInterval);
  const sub = await getSubscriptionsRepo().getByUserId(userId);
  if (!sub?.paddle_subscription_id) {
    throw new BillingError('subscription_not_found', paddleUserMessage('subscription_not_found'), 404);
  }
  if (sub.scheduled_change) {
    throw new BillingError('scheduled_change', paddleUserMessage('scheduled_change'), 409);
  }
  if (sub.paddle_price_id === priceId || sub.plan === planKey) {
    throw new BillingError('same_plan', paddleUserMessage('same_plan'), 409);
  }

  await wrapPaddle(() =>
    getPaddleClient().subscriptions.update(sub.paddle_subscription_id!, {
      items: [{ priceId, quantity: 1 }],
      prorationBillingMode: 'prorated_immediately',
    })
  );
  paddleLog('subscription_updated', { userId, plan: planKey, action: 'change_plan' });
  return { plan: planKey };
}

export async function createBillingPortalUrl(userId: string) {
  const sub = await getSubscriptionsRepo().getByUserId(userId);
  if (!sub?.paddle_customer_id || !sub.paddle_subscription_id) {
    throw new BillingError('customer_not_found', paddleUserMessage('customer_not_found'), 404);
  }
  const session = await wrapPaddle(() =>
    getPaddleClient().customerPortalSessions.create(sub.paddle_customer_id!, [
      sub.paddle_subscription_id!,
    ])
  );
  return { url: session.urls.general.overview };
}

export function checkoutPlanKey(plan: string, interval: string) {
  if (plan === 'pro' && (interval === 'monthly' || interval === 'yearly')) {
    return planKeyFor('pro', interval);
  }
  return null;
}
