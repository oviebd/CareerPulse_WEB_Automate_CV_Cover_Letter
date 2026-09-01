import { desc, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { payments } from '@/lib/db/schema';
import { fromSnake, toSnake } from '@/lib/db/map-row';

async function listByUser(userId: string) {
  const db = getDb();
  const rows = await db
    .select({
      id: payments.id,
      plan: payments.plan,
      amount: payments.amount,
      status: payments.status,
      created_at: payments.createdAt,
    })
    .from(payments)
    .where(eq(payments.userId, userId))
    .orderBy(desc(payments.createdAt));
  return rows;
}

async function insert(row: Record<string, unknown>) {
  const db = getDb();
  const mapped = fromSnake(row);
  const [created] = await db.insert(payments).values(mapped as typeof payments.$inferInsert).returning();
  return toSnake(created);
}

async function updateByTranId(tranId: string, patch: Record<string, unknown>) {
  const db = getDb();
  const mapped = fromSnake(patch);
  const [updated] = await db
    .update(payments)
    .set(mapped as Partial<typeof payments.$inferInsert>)
    .where(eq(payments.tranId, tranId))
    .returning();
  return updated ? toSnake(updated) : null;
}

async function deleteByTranId(tranId: string) {
  const db = getDb();
  await db.delete(payments).where(eq(payments.tranId, tranId));
}

async function getByTranId(tranId: string) {
  const db = getDb();
  const [row] = await db.select().from(payments).where(eq(payments.tranId, tranId)).limit(1);
  return row ? toSnake(row) : null;
}

export function getPaymentsRepo() {
  return { listByUser, insert, updateByTranId, deleteByTranId, getByTranId };
}
