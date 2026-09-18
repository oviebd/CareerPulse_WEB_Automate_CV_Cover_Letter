import { and, eq, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { quotaUsage } from '@/lib/db/schema';
import type { QuotaMetric } from '@/lib/quotas/catalog';

async function getRow(userId: string, metric: QuotaMetric, periodKey: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(quotaUsage)
    .where(
      and(
        eq(quotaUsage.userId, userId),
        eq(quotaUsage.metric, metric),
        eq(quotaUsage.periodKey, periodKey)
      )
    )
    .limit(1);
  return row ?? null;
}

async function ensureRow(userId: string, metric: QuotaMetric, periodKey: string) {
  const db = getDb();
  await db
    .insert(quotaUsage)
    .values({ userId, metric, periodKey, used: 0, bonus: 0 })
    .onConflictDoNothing();
}

async function incrementUsed(userId: string, metric: QuotaMetric, periodKey: string, delta = 1) {
  const db = getDb();
  await ensureRow(userId, metric, periodKey);
  await db
    .update(quotaUsage)
    .set({
      used: sql`${quotaUsage.used} + ${delta}`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(quotaUsage.userId, userId),
        eq(quotaUsage.metric, metric),
        eq(quotaUsage.periodKey, periodKey)
      )
    );
}

async function addBonus(userId: string, metric: QuotaMetric, periodKey: string, amount: number) {
  if (amount <= 0) return;
  const db = getDb();
  await ensureRow(userId, metric, periodKey);
  await db
    .update(quotaUsage)
    .set({
      bonus: sql`${quotaUsage.bonus} + ${amount}`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(quotaUsage.userId, userId),
        eq(quotaUsage.metric, metric),
        eq(quotaUsage.periodKey, periodKey)
      )
    );
}

export function getQuotasRepo() {
  return { getRow, ensureRow, incrementUsed, addBonus };
}
