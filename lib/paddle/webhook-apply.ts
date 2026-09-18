import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type {
  CustomerNotification,
  EventEntity,
  SubscriptionNotification,
  TransactionNotification,
} from '@paddle/paddle-node-sdk';
import { getDb } from '@/lib/db/client';
import {
  markPaddleWebhookEventStatus,
  tryInsertPaddleWebhookEvent,
} from '@/lib/db/repositories/paddle-webhook-events';
import { payments, profiles, subscriptions } from '@/lib/db/schema';
import { paddleMinorToDecimal } from '@/lib/paddle/amount';
import { userIdFromCustomData } from '@/lib/paddle/custom-data';
import { paddleLog } from '@/lib/paddle/log';
import { shouldSkipStaleEvent, subscriptionNotificationToLocalState } from '@/lib/paddle/map-status';
import { planKeyFromPriceId } from '@/lib/paddle/plans';
import { grantCreditsForCompletedPaddleTransaction } from '@/lib/credits/paddle-grants';
import { priceIdFromPaddleItems, webhookApplyKind } from '@/lib/paddle/webhook-handlers';

type Tx = Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0];

function payloadHash(rawBody: string): string {
  return createHash('sha256').update(rawBody).digest('hex');
}

async function resolveUserId(
  tx: Tx,
  params: {
    customUserId: string | null;
    paddleSubscriptionId: string | null;
    paddleCustomerId: string | null;
  }
): Promise<string | null> {
  if (params.customUserId) {
    const [profile] = await tx
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.id, params.customUserId))
      .limit(1);
    if (profile) return profile.id;
  }
  if (params.paddleSubscriptionId) {
    const [bySub] = await tx
      .select({ userId: subscriptions.userId })
      .from(subscriptions)
      .where(eq(subscriptions.paddleSubscriptionId, params.paddleSubscriptionId))
      .limit(1);
    if (bySub) return bySub.userId;
  }
  if (params.paddleCustomerId) {
    const [byCustomer] = await tx
      .select({ userId: subscriptions.userId })
      .from(subscriptions)
      .where(eq(subscriptions.paddleCustomerId, params.paddleCustomerId))
      .limit(1);
    if (byCustomer) return byCustomer.userId;
  }
  return null;
}

async function upsertSubscription(
  tx: Tx,
  userId: string,
  patch: Partial<typeof subscriptions.$inferInsert> & { userId: string }
) {
  const [existing] = await tx
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  const now = new Date();
  if (existing) {
    await tx
      .update(subscriptions)
      .set({ ...patch, updatedAt: now })
      .where(eq(subscriptions.userId, userId));
    return;
  }
  await tx.insert(subscriptions).values({ ...patch, createdAt: now, updatedAt: now });
}

async function applySubscriptionEntity(
  tx: Tx,
  eventId: string,
  occurredAt: string,
  sub: SubscriptionNotification,
  transactionId?: string | null
): Promise<'applied' | 'skipped_user' | 'stale'> {
  const userId = await resolveUserId(tx, {
    customUserId: userIdFromCustomData(sub.customData),
    paddleSubscriptionId: sub.id,
    paddleCustomerId: sub.customerId,
  });
  if (!userId) {
    paddleLog('paddle_webhook_processed', { eventId, result: 'missing_user' });
    return 'skipped_user';
  }

  const [current] = await tx
    .select({ lastEventOccurredAt: subscriptions.lastEventOccurredAt })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  if (shouldSkipStaleEvent(current?.lastEventOccurredAt, occurredAt)) {
    paddleLog('paddle_webhook_processed', { eventId, result: 'stale' });
    return 'stale';
  }

  const local = subscriptionNotificationToLocalState(sub);
  await upsertSubscription(tx, userId, {
    userId,
    paddleCustomerId: sub.customerId,
    paddleSubscriptionId: sub.id,
    paddleTransactionId: transactionId ?? null,
    paddlePriceId: local.paddlePriceId,
    plan: local.plan,
    status: local.status,
    billingInterval: local.billingInterval,
    currentPeriodStart: local.currentPeriodStart ? new Date(local.currentPeriodStart) : null,
    currentPeriodEnd: local.currentPeriodEnd ? new Date(local.currentPeriodEnd) : null,
    scheduledChange: local.scheduledChange,
    cancelAtPeriodEnd: local.cancelAtPeriodEnd,
    lastEventId: eventId,
    lastEventOccurredAt: new Date(occurredAt),
  });

  await tx
    .update(profiles)
    .set({
      subscriptionTier: local.tier,
      subscriptionStatus: local.status,
      subscriptionExpiresAt: local.currentPeriodEnd ? new Date(local.currentPeriodEnd) : null,
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, userId));

  paddleLog('subscription_updated', {
    eventId,
    userId,
    status: local.status,
    plan: local.plan,
  });
  return 'applied';
}

async function applyTransaction(
  tx: Tx,
  eventId: string,
  txEntity: TransactionNotification,
  status: 'success' | 'failed'
) {
  const userId = await resolveUserId(tx, {
    customUserId: userIdFromCustomData(txEntity.customData),
    paddleSubscriptionId: txEntity.subscriptionId,
    paddleCustomerId: txEntity.customerId,
  });
  if (!userId) {
    paddleLog('paddle_webhook_processed', { eventId, result: 'missing_user' });
    return;
  }

  const priceId = priceIdFromPaddleItems(txEntity.items);
  if (status === 'success') {
    await grantCreditsForCompletedPaddleTransaction({
      userId,
      priceId,
      paddleTransactionId: txEntity.id,
      eventId,
    });
  }

  const amount = paddleMinorToDecimal(
    txEntity.details?.totals?.grandTotal ?? txEntity.details?.totals?.total,
    txEntity.currencyCode
  );
  if (amount == null || amount <= 0) {
    paddleLog('paddle_webhook_processed', { eventId, result: 'payment_skipped_amount' });
    return;
  }

  const existing = await tx
    .select({ id: payments.id })
    .from(payments)
    .where(eq(payments.tranId, txEntity.id))
    .limit(1);
  const periodStart = txEntity.billingPeriod?.startsAt
    ? new Date(txEntity.billingPeriod.startsAt)
    : null;
  const periodEnd = txEntity.billingPeriod?.endsAt ? new Date(txEntity.billingPeriod.endsAt) : null;
  const patch = {
    userId,
    tranId: txEntity.id,
    amount: String(amount),
    currency: txEntity.currencyCode,
    status,
    plan: planKeyFromPriceId(priceId) ?? 'pro_monthly',
    billingPeriodStart: periodStart,
    billingPeriodEnd: periodEnd,
    gatewayResponse: { paddleTransactionId: txEntity.id, origin: txEntity.origin },
    updatedAt: new Date(),
  };
  if (existing[0]) {
    await tx.update(payments).set(patch).where(eq(payments.tranId, txEntity.id));
  } else {
    await tx.insert(payments).values(patch);
  }
}

async function applyCustomer(tx: Tx, eventId: string, customer: CustomerNotification) {
  const userId = await resolveUserId(tx, {
    customUserId: userIdFromCustomData(customer.customData),
    paddleSubscriptionId: null,
    paddleCustomerId: customer.id,
  });
  if (!userId) {
    paddleLog('paddle_webhook_processed', { eventId, result: 'missing_user' });
    return;
  }
  const [existing] = await tx
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  const now = new Date();
  if (existing) {
    await tx
      .update(subscriptions)
      .set({ paddleCustomerId: customer.id, updatedAt: now })
      .where(eq(subscriptions.userId, userId));
    return;
  }
  await tx.insert(subscriptions).values({
    userId,
    paddleCustomerId: customer.id,
    status: 'inactive',
    createdAt: now,
    updatedAt: now,
  });
}

export async function processVerifiedEvent(event: EventEntity, rawBody: string): Promise<'processed' | 'duplicate' | 'ignored'> {
  const db = getDb();
  return db.transaction(async (tx) => {
    const insertResult = await tryInsertPaddleWebhookEvent(tx, {
      eventId: event.eventId,
      eventType: event.eventType,
      payloadHash: payloadHash(rawBody),
      occurredAt: new Date(event.occurredAt),
    });

    if (insertResult === 'duplicate') {
      paddleLog('paddle_webhook_duplicate', { eventId: event.eventId, eventType: event.eventType });
      return 'duplicate';
    }

    const kind = webhookApplyKind(event.eventType);
    if (kind === 'subscription') {
      const data = event.data as SubscriptionNotification & { transactionId?: string };
      await applySubscriptionEntity(tx, event.eventId, event.occurredAt, data, data.transactionId);
      return 'processed';
    }
    if (kind === 'transaction_success') {
      await applyTransaction(tx, event.eventId, event.data as TransactionNotification, 'success');
      return 'processed';
    }
    if (kind === 'transaction_failed') {
      await applyTransaction(tx, event.eventId, event.data as TransactionNotification, 'failed');
      return 'processed';
    }
    if (kind === 'customer') {
      await applyCustomer(tx, event.eventId, event.data as CustomerNotification);
      return 'processed';
    }

    await markPaddleWebhookEventStatus(tx, event.eventId, 'ignored');
    paddleLog('paddle_webhook_processed', {
      eventId: event.eventId,
      result: 'ignored',
      eventType: event.eventType,
    });
    return 'ignored';
  });
}
