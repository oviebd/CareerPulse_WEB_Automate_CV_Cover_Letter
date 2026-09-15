import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { shouldSkipStaleEvent, subscriptionNotificationToLocalState } from '@/lib/paddle/map-status';
import type { SubscriptionNotification } from '@paddle/paddle-node-sdk';

function sub(
  status: SubscriptionNotification['status'],
  extra?: Partial<SubscriptionNotification>
): SubscriptionNotification {
  return {
    id: 'sub_1',
    status,
    customerId: 'ctm_1',
    items: [{ price: { id: 'pri_month' } }],
    currentBillingPeriod: {
      startsAt: '2026-01-01T00:00:00Z',
      endsAt: '2026-02-01T00:00:00Z',
    },
    scheduledChange: null,
    billingCycle: { interval: 'month', frequency: 1 },
    customData: { careerPulseUserId: '11111111-1111-4111-8111-111111111111' },
    ...extra,
  } as unknown as SubscriptionNotification;
}

describe('map-status', () => {
  const prevMonth = process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_MONTHLY;
  const prevYear = process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_YEARLY;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_MONTHLY = 'pri_month';
    process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_YEARLY = 'pri_year';
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_MONTHLY = prevMonth;
    process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_YEARLY = prevYear;
  });

  it('maps active subscription to pro', () => {
    const local = subscriptionNotificationToLocalState(sub('active'));
    expect(local.tier).toBe('pro');
    expect(local.status).toBe('active');
    expect(local.plan).toBe('pro_monthly');
  });

  it('keeps access scheduled for period-end cancel', () => {
    const local = subscriptionNotificationToLocalState(
      sub('active', {
        scheduledChange: { action: 'cancel', effectiveAt: '2026-02-01T00:00:00Z', resumeAt: null },
      } as Partial<SubscriptionNotification>)
    );
    expect(local.tier).toBe('pro');
    expect(local.status).toBe('cancelled');
    expect(local.cancelAtPeriodEnd).toBe(true);
  });

  it('revokes access when Paddle status is canceled and the period has ended', () => {
    const local = subscriptionNotificationToLocalState(sub('canceled'));
    expect(local.tier).toBe('free');
    expect(local.status).toBe('cancelled');
  });

  it('keeps pro when Paddle canceled but the current period is still in the future', () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    const local = subscriptionNotificationToLocalState(
      sub('canceled', {
        currentBillingPeriod: {
          startsAt: '2026-01-01T00:00:00Z',
          endsAt: future,
        },
      } as Partial<SubscriptionNotification>)
    );
    expect(local.tier).toBe('pro');
    expect(local.status).toBe('cancelled');
    expect(local.cancelAtPeriodEnd).toBe(true);
  });

  it('marks paused without premium access flag on local status', () => {
    const local = subscriptionNotificationToLocalState(sub('paused'));
    expect(local.status).toBe('paused');
    expect(local.tier).toBe('pro');
  });

  it('skips older events', () => {
    expect(shouldSkipStaleEvent('2026-02-01T00:00:00Z', '2026-01-01T00:00:00Z')).toBe(true);
    expect(shouldSkipStaleEvent('2026-01-01T00:00:00Z', '2026-02-01T00:00:00Z')).toBe(false);
  });
});
