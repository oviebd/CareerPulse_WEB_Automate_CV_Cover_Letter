import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { Environment, EventName, Paddle } from '@paddle/paddle-node-sdk';
import { interpretWebhookInsert } from '@/lib/db/repositories/paddle-webhook-events';
import { BillingError } from '@/lib/paddle/errors';
import { handlePaddleWebhook } from '@/lib/paddle/webhook-service';
import { resolveWebhookUserId, webhookApplyKind } from '@/lib/paddle/webhook-handlers';

function sign(body: string, secret: string) {
  const ts = Math.floor(Date.now() / 1000);
  const h1 = createHmac('sha256', secret).update(`${ts}:${body}`).digest('hex');
  return `ts=${ts};h1=${h1}`;
}

describe('paddle webhook signature', () => {
  const secret = 'pdl_ntfset_test_secret';
  const body = JSON.stringify({
    event_id: 'evt_01test',
    event_type: 'unhandled.event',
    occurred_at: new Date().toISOString(),
    data: {},
  });

  it('accepts a valid Paddle-Signature', async () => {
    process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT = 'sandbox';
    process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN = 'test_token';
    process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_MONTHLY = 'pri_month';
    process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_YEARLY = 'pri_year';
    process.env.PADDLE_API_KEY = 'pdl_sdbx_test';
    process.env.PADDLE_WEBHOOK_SECRET = secret;
    const paddle = new Paddle('pdl_sdbx_test', { environment: Environment.sandbox });
    const event = await paddle.webhooks.unmarshal(body, secret, sign(body, secret));
    expect(event.eventId).toBe('evt_01test');
  });

  it('rejects an invalid signature', async () => {
    const paddle = new Paddle('pdl_sdbx_test', { environment: Environment.sandbox });
    await expect(paddle.webhooks.unmarshal(body, secret, 'ts=1;h1=deadbeef')).rejects.toThrow();
  });

  it('rejects missing signature at the webhook handler', async () => {
    process.env.PADDLE_API_KEY = 'pdl_sdbx_test';
    process.env.PADDLE_WEBHOOK_SECRET = secret;
    process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN = 'test_token';
    process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_MONTHLY = 'pri_month';
    process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_YEARLY = 'pri_year';
    await expect(handlePaddleWebhook(body, null)).rejects.toBeInstanceOf(BillingError);
  });
});

describe('paddle webhook apply routing', () => {
  it('handles subscription created/updated/canceled', () => {
    expect(webhookApplyKind(EventName.SubscriptionCreated)).toBe('subscription');
    expect(webhookApplyKind(EventName.SubscriptionUpdated)).toBe('subscription');
    expect(webhookApplyKind(EventName.SubscriptionCanceled)).toBe('subscription');
  });

  it('handles payment failed and completed transactions', () => {
    expect(webhookApplyKind(EventName.TransactionCompleted)).toBe('transaction_success');
    expect(webhookApplyKind(EventName.TransactionPaymentFailed)).toBe('transaction_failed');
  });

  it('records unknown events as ignored', () => {
    expect(webhookApplyKind('unhandled.event')).toBe('ignored');
    expect(webhookApplyKind(EventName.AddressCreated)).toBe('ignored');
  });

  it('treats a conflict insert as a duplicate event_id', () => {
    expect(interpretWebhookInsert([{ eventId: 'evt_1' }])).toBe('inserted');
    expect(interpretWebhookInsert([])).toBe('duplicate');
  });
});

describe('paddle webhook user resolution', () => {
  const custom = '11111111-1111-4111-8111-111111111111';
  const bySub = '22222222-2222-4222-8222-222222222222';
  const byCustomer = '33333333-3333-4333-8333-333333333333';

  it('prefers custom_data.careerPulseUserId when the profile exists', () => {
    expect(
      resolveWebhookUserId({
        customUserId: custom,
        customUserExists: true,
        paddleSubscriptionUserId: bySub,
        paddleCustomerUserId: byCustomer,
      })
    ).toBe(custom);
  });

  it('falls back to paddle subscription then customer ids', () => {
    expect(
      resolveWebhookUserId({
        customUserId: custom,
        customUserExists: false,
        paddleSubscriptionUserId: bySub,
        paddleCustomerUserId: byCustomer,
      })
    ).toBe(bySub);
    expect(
      resolveWebhookUserId({
        customUserId: null,
        customUserExists: false,
        paddleSubscriptionUserId: null,
        paddleCustomerUserId: byCustomer,
      })
    ).toBe(byCustomer);
  });

  it('does not grant access when no user can be resolved', () => {
    expect(
      resolveWebhookUserId({
        customUserId: custom,
        customUserExists: false,
        paddleSubscriptionUserId: null,
        paddleCustomerUserId: null,
      })
    ).toBeNull();
  });
});
