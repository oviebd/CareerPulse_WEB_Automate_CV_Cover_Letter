import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { paddleWebhookEvents } from '@/lib/db/schema';

export type WebhookEventStatus = 'processed' | 'ignored' | 'failed';

type DbClient = ReturnType<typeof getDb>;
type TxClient = Parameters<Parameters<DbClient['transaction']>[0]>[0];
export type DbExecutor = DbClient | TxClient;

export function interpretWebhookInsert(returning: readonly unknown[]): 'inserted' | 'duplicate' {
  return returning.length === 0 ? 'duplicate' : 'inserted';
}

export async function tryInsertPaddleWebhookEvent(
  db: DbExecutor,
  values: {
    eventId: string;
    eventType: string;
    payloadHash: string;
    occurredAt: Date;
  }
): Promise<'inserted' | 'duplicate'> {
  const inserted = await db
    .insert(paddleWebhookEvents)
    .values({
      eventId: values.eventId,
      eventType: values.eventType,
      status: 'processed',
      payloadHash: values.payloadHash,
      occurredAt: values.occurredAt,
      processedAt: new Date(),
    })
    .onConflictDoNothing()
    .returning({ eventId: paddleWebhookEvents.eventId });
  return interpretWebhookInsert(inserted);
}

export async function markPaddleWebhookEventStatus(
  db: DbExecutor,
  eventId: string,
  status: WebhookEventStatus
) {
  await db
    .update(paddleWebhookEvents)
    .set({ status, processedAt: new Date() })
    .where(eq(paddleWebhookEvents.eventId, eventId));
}

export function getPaddleWebhookEventsRepo(db: DbExecutor = getDb()) {
  return {
    tryInsert: (values: Parameters<typeof tryInsertPaddleWebhookEvent>[1]) =>
      tryInsertPaddleWebhookEvent(db, values),
    markStatus: (eventId: string, status: WebhookEventStatus) =>
      markPaddleWebhookEventStatus(db, eventId, status),
  };
}
