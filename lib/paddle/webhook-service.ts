import { ApiError } from '@paddle/paddle-node-sdk';
import { getPaddleClient } from '@/lib/paddle/client';
import { paddleLog } from '@/lib/paddle/log';
import { processVerifiedEvent } from '@/lib/paddle/webhook-apply';
import { assertPaddleServerConfig } from '@/lib/config/paddle';
import { BillingError } from '@/lib/paddle/errors';

export async function handlePaddleWebhook(rawBody: string, signature: string | null) {
  paddleLog('paddle_webhook_received', { hasSignature: Boolean(signature) });
  if (!signature) {
    throw new BillingError('invalid_signature', 'Invalid webhook signature', 400);
  }

  const config = assertPaddleServerConfig();
  let event;
  try {
    event = await getPaddleClient().webhooks.unmarshal(rawBody, config.webhookSecret, signature);
  } catch (error) {
    paddleLog('paddle_webhook_verified', { ok: false });
    if (error instanceof BillingError) throw error;
    throw new BillingError('invalid_signature', 'Invalid webhook signature', 400);
  }

  paddleLog('paddle_webhook_verified', {
    ok: true,
    eventId: event.eventId,
    eventType: event.eventType,
  });

  try {
    const result = await processVerifiedEvent(event, rawBody);
    paddleLog('paddle_webhook_processed', {
      eventId: event.eventId,
      eventType: event.eventType,
      result,
    });
    return result;
  } catch (error) {
    if (error instanceof ApiError) {
      paddleLog('paddle_api_error', { eventId: event.eventId });
    }
    throw error;
  }
}
