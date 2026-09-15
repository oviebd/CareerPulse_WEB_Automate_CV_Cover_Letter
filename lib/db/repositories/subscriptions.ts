import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { subscriptions } from '@/lib/db/schema';
import { toSnake } from '@/lib/db/map-row';

export type SubscriptionRow = {
  id: string;
  user_id: string;
  paddle_customer_id: string | null;
  paddle_subscription_id: string | null;
  paddle_transaction_id: string | null;
  paddle_price_id: string | null;
  plan: string | null;
  status: string;
  billing_interval: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  scheduled_change: Record<string, unknown> | null;
  cancel_at_period_end: boolean;
  last_event_id: string | null;
  last_event_occurred_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapRow(row: typeof subscriptions.$inferSelect): SubscriptionRow {
  return toSnake(row as unknown as Record<string, unknown>) as unknown as SubscriptionRow;
}

async function getByUserId(userId: string): Promise<SubscriptionRow | null> {
  const db = getDb();
  const [row] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  return row ? mapRow(row) : null;
}

async function getByPaddleSubscriptionId(id: string): Promise<SubscriptionRow | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.paddleSubscriptionId, id))
    .limit(1);
  return row ? mapRow(row) : null;
}

async function getByPaddleCustomerId(id: string): Promise<SubscriptionRow | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.paddleCustomerId, id))
    .limit(1);
  return row ? mapRow(row) : null;
}

export function getSubscriptionsRepo() {
  return { getByUserId, getByPaddleSubscriptionId, getByPaddleCustomerId };
}
