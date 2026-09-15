import type { SubscriptionNotification } from '@paddle/paddle-node-sdk';
import { intervalFromPlanKey, planKeyFromPriceId } from '@/lib/paddle/plans';
import type { PricingPlanKey, SubscriptionStatus, SubscriptionTier } from '@/types';

export type LocalSubscriptionState = {
  plan: PricingPlanKey | null;
  billingInterval: 'monthly' | 'yearly' | null;
  paddlePriceId: string | null;
  status: SubscriptionStatus;
  tier: SubscriptionTier;
  cancelAtPeriodEnd: boolean;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  scheduledChange: Record<string, unknown> | null;
};

export function mapPaddleStatus(paddleStatus: string): SubscriptionStatus {
  switch (paddleStatus) {
    case 'trialing':
      return 'trialing';
    case 'active':
      return 'active';
    case 'past_due':
      return 'past_due';
    case 'paused':
      return 'paused';
    case 'canceled':
      return 'cancelled';
    default:
      return 'inactive';
  }
}

export function subscriptionNotificationToLocalState(
  sub: Pick<
    SubscriptionNotification,
    'status' | 'items' | 'currentBillingPeriod' | 'scheduledChange' | 'billingCycle'
  >
): LocalSubscriptionState {
  const paddlePriceId = sub.items.find((item) => item.price?.id)?.price?.id ?? null;
  const plan = planKeyFromPriceId(paddlePriceId);
  const billingInterval =
    intervalFromPlanKey(plan) ??
    (sub.billingCycle.interval === 'year' ? 'yearly' : 'monthly');
  const periodStart = sub.currentBillingPeriod?.startsAt ?? null;
  const periodEnd = sub.currentBillingPeriod?.endsAt ?? null;
  const scheduled = sub.scheduledChange
    ? {
        action: sub.scheduledChange.action,
        effectiveAt: sub.scheduledChange.effectiveAt,
        resumeAt: sub.scheduledChange.resumeAt,
      }
    : null;
  const cancelAtPeriodEnd = scheduled?.action === 'cancel';
  const paddleStatus = mapPaddleStatus(sub.status);

  if (paddleStatus === 'cancelled') {
    const stillInPeriod = Boolean(periodEnd && new Date(periodEnd).getTime() > Date.now());
    return {
      plan,
      billingInterval,
      paddlePriceId,
      status: 'cancelled',
      tier: stillInPeriod ? 'pro' : 'free',
      cancelAtPeriodEnd: stillInPeriod,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      scheduledChange: scheduled,
    };
  }

  if (paddleStatus === 'paused') {
    return {
      plan,
      billingInterval,
      paddlePriceId,
      status: 'paused',
      tier: 'pro',
      cancelAtPeriodEnd,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      scheduledChange: scheduled,
    };
  }

  return {
    plan,
    billingInterval,
    paddlePriceId,
    status: cancelAtPeriodEnd ? 'cancelled' : paddleStatus,
    tier: 'pro',
    cancelAtPeriodEnd,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    scheduledChange: scheduled,
  };
}

export function shouldSkipStaleEvent(
  lastOccurredAt: string | Date | null | undefined,
  incomingOccurredAt: string
): boolean {
  if (!lastOccurredAt) return false;
  const last = lastOccurredAt instanceof Date ? lastOccurredAt.getTime() : new Date(lastOccurredAt).getTime();
  const incoming = new Date(incomingOccurredAt).getTime();
  if (Number.isNaN(last) || Number.isNaN(incoming)) return false;
  return incoming < last;
}
