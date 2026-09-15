import { EventName } from '@paddle/paddle-node-sdk';

export type WebhookApplyKind =
  | 'subscription'
  | 'transaction_success'
  | 'transaction_failed'
  | 'customer'
  | 'ignored';

const SUBSCRIPTION_EVENTS = new Set<string>([
  EventName.SubscriptionCreated,
  EventName.SubscriptionUpdated,
  EventName.SubscriptionCanceled,
  EventName.SubscriptionPastDue,
  EventName.SubscriptionPaused,
  EventName.SubscriptionResumed,
  EventName.SubscriptionTrialing,
  EventName.SubscriptionActivated,
]);

export function webhookApplyKind(eventType: string): WebhookApplyKind {
  if (SUBSCRIPTION_EVENTS.has(eventType)) return 'subscription';
  if (eventType === EventName.TransactionCompleted) return 'transaction_success';
  if (eventType === EventName.TransactionPaymentFailed) return 'transaction_failed';
  if (eventType === EventName.CustomerCreated || eventType === EventName.CustomerUpdated) {
    return 'customer';
  }
  return 'ignored';
}

export function resolveWebhookUserId(params: {
  customUserId: string | null;
  customUserExists: boolean;
  paddleSubscriptionUserId: string | null;
  paddleCustomerUserId: string | null;
}): string | null {
  if (params.customUserId && params.customUserExists) return params.customUserId;
  if (params.paddleSubscriptionUserId) return params.paddleSubscriptionUserId;
  if (params.paddleCustomerUserId) return params.paddleCustomerUserId;
  return null;
}
