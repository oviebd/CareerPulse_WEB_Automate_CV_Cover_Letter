import { and, desc, eq, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { cvs } from '@/lib/db/schema';
import { fromSnake, toSnake } from '@/lib/db/map-row';

async function listByUser(userId: string, opts?: { generalOnly?: boolean; includeArchived?: boolean }) {
  const db = getDb();
  const conditions = [eq(cvs.userId, userId)];
  if (!opts?.includeArchived) conditions.push(eq(cvs.isArchived, false));
  let rows = await db
    .select()
    .from(cvs)
    .where(and(...conditions))
    .orderBy(desc(cvs.createdAt));
  if (opts?.generalOnly) {
    rows = rows.filter((r) => !r.jobIds?.length);
  }
  return rows.map((r) => toSnake(r));
}

async function getById(userId: string, id: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(cvs)
    .where(and(eq(cvs.id, id), eq(cvs.userId, userId)))
    .limit(1);
  return row ? toSnake(row) : null;
}

async function getLatestGeneral(userId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(cvs)
    .where(and(eq(cvs.userId, userId), eq(cvs.isArchived, false)))
    .orderBy(desc(cvs.createdAt))
    .limit(40);
  const general = rows.find((r) => !r.jobIds?.length);
  return general ? toSnake(general) : null;
}

async function insert(userId: string, row: Record<string, unknown>) {
  const db = getDb();
  const mapped = fromSnake(row);
  delete mapped.userId;
  const [created] = await db
    .insert(cvs)
    .values({ ...mapped, userId } as typeof cvs.$inferInsert)
    .returning();
  return toSnake(created);
}

async function update(userId: string, id: string, patch: Record<string, unknown>) {
  const db = getDb();
  const mapped = fromSnake(patch);
  delete mapped.id;
  delete mapped.userId;
  const [updated] = await db
    .update(cvs)
    .set(mapped as Partial<typeof cvs.$inferInsert>)
    .where(and(eq(cvs.id, id), eq(cvs.userId, userId)))
    .returning();
  if (!updated) throw new Error('CV not found');
  return toSnake(updated);
}

async function remove(userId: string, id: string, hard = false) {
  const db = getDb();
  if (hard) {
    await db.delete(cvs).where(and(eq(cvs.id, id), eq(cvs.userId, userId)));
  } else {
    await db.update(cvs).set({ isArchived: true }).where(and(eq(cvs.id, id), eq(cvs.userId, userId)));
  }
}

async function countTailoredThisMonth(userId: string): Promise<number> {
  const db = getDb();
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const rows = await db
    .select({ id: cvs.id })
    .from(cvs)
    .where(
      and(
        eq(cvs.userId, userId),
        sql`cardinality(${cvs.jobIds}) > 0`,
        sql`${cvs.createdAt} >= ${start.toISOString()}`
      )
    );
  return rows.length;
}

export function getCvsRepo() {
  return { listByUser, getById, getLatestGeneral, insert, update, remove, countTailoredThisMonth };
}
