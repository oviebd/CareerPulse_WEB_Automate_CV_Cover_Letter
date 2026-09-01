import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { coverLetters } from '@/lib/db/schema';
import { fromSnake, toSnake } from '@/lib/db/map-row';

async function listByUser(userId: string, jobId?: string) {
  const db = getDb();
  let rows = await db
    .select()
    .from(coverLetters)
    .where(eq(coverLetters.userId, userId))
    .orderBy(desc(coverLetters.createdAt));
  if (jobId) rows = rows.filter((r) => r.jobIds?.includes(jobId));
  return rows.map((r) => toSnake(r));
}

async function getById(userId: string, id: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(coverLetters)
    .where(and(eq(coverLetters.id, id), eq(coverLetters.userId, userId)))
    .limit(1);
  return row ? toSnake(row) : null;
}

async function getByShareToken(token: string) {
  const db = getDb();
  const [row] = await db.select().from(coverLetters).where(eq(coverLetters.shareToken, token)).limit(1);
  return row ? toSnake(row) : null;
}

async function insert(userId: string, row: Record<string, unknown>) {
  const db = getDb();
  const mapped = fromSnake(row);
  delete mapped.userId;
  const [created] = await db
    .insert(coverLetters)
    .values({ ...mapped, userId } as typeof coverLetters.$inferInsert)
    .returning();
  return toSnake(created);
}

async function update(userId: string, id: string, patch: Record<string, unknown>) {
  const db = getDb();
  const mapped = fromSnake(patch);
  delete mapped.id;
  delete mapped.userId;
  const [updated] = await db
    .update(coverLetters)
    .set(mapped as Partial<typeof coverLetters.$inferInsert>)
    .where(and(eq(coverLetters.id, id), eq(coverLetters.userId, userId)))
    .returning();
  if (!updated) throw new Error('Cover letter not found');
  return toSnake(updated);
}

async function remove(userId: string, id: string) {
  const db = getDb();
  await db.delete(coverLetters).where(and(eq(coverLetters.id, id), eq(coverLetters.userId, userId)));
}

export function getCoverLettersRepo() {
  return { listByUser, getById, getByShareToken, insert, update, remove };
}
