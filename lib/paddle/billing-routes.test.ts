import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth/session', () => ({
  getSessionUser: vi.fn(),
}));

vi.mock('@/lib/paddle/subscription-service', () => ({
  createCheckoutPayload: vi.fn(),
  cancelUserSubscription: vi.fn(),
  changeUserPlan: vi.fn(),
}));

import { getSessionUser } from '@/lib/auth/session';
import {
  cancelUserSubscription,
  changeUserPlan,
  createCheckoutPayload,
} from '@/lib/paddle/subscription-service';
import { POST as cancelPost } from '@/app/api/billing/cancel/route';
import { POST as changePlanPost } from '@/app/api/billing/change-plan/route';
import { POST as checkoutPost } from '@/app/api/billing/checkout/route';

const sessionUser = { id: '11111111-1111-4111-8111-111111111111', email: 'owner@test.com' };

describe('billing routes auth', () => {
  beforeEach(() => {
    vi.mocked(getSessionUser).mockReset();
    vi.mocked(createCheckoutPayload).mockReset();
    vi.mocked(cancelUserSubscription).mockReset();
    vi.mocked(changeUserPlan).mockReset();
  });

  it('rejects checkout, cancel, and change-plan without a session', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const checkout = await checkoutPost(
      new Request('http://localhost/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan: 'pro', billingInterval: 'monthly' }),
      })
    );
    const cancel = await cancelPost();
    const change = await changePlanPost(
      new Request('http://localhost/api/billing/change-plan', {
        method: 'POST',
        body: JSON.stringify({ plan: 'pro', billingInterval: 'yearly' }),
      })
    );

    expect(checkout.status).toBe(401);
    expect(cancel.status).toBe(401);
    expect(change.status).toBe(401);
    expect(createCheckoutPayload).not.toHaveBeenCalled();
    expect(cancelUserSubscription).not.toHaveBeenCalled();
    expect(changeUserPlan).not.toHaveBeenCalled();
  });

  it('ignores another user id in the checkout body', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(sessionUser);
    vi.mocked(createCheckoutPayload).mockResolvedValue({
      priceId: 'pri_month',
      email: sessionUser.email,
      customerId: null,
      customData: { careerPulseUserId: sessionUser.id, source: 'career_pulse_web', plan: 'pro_monthly' },
      environment: 'sandbox',
    });

    const response = await checkoutPost(
      new Request('http://localhost/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({
          plan: 'pro',
          billingInterval: 'monthly',
          userId: '99999999-9999-4999-8999-999999999999',
          customerId: 'ctm_other',
          subscriptionId: 'sub_other',
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(createCheckoutPayload).toHaveBeenCalledWith(sessionUser, 'pro', 'monthly');
  });

  it('cancels and changes plan for the session user only', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(sessionUser);
    vi.mocked(cancelUserSubscription).mockResolvedValue({ mode: 'period_end', currentPeriodEnd: null });
    vi.mocked(changeUserPlan).mockResolvedValue({ plan: 'pro_yearly' });

    await cancelPost();
    await changePlanPost(
      new Request('http://localhost/api/billing/change-plan', {
        method: 'POST',
        body: JSON.stringify({
          plan: 'pro',
          billingInterval: 'yearly',
          userId: '99999999-9999-4999-8999-999999999999',
        }),
      })
    );

    expect(cancelUserSubscription).toHaveBeenCalledWith(sessionUser.id);
    expect(changeUserPlan).toHaveBeenCalledWith(sessionUser.id, 'pro', 'yearly');
  });
});
