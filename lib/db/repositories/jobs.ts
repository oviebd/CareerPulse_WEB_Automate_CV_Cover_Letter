import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { jobs } from '@/lib/db/schema';
import { fromSnake, toSnake } from '@/lib/db/map-row';

async function listByUser(userId: string) {
  const db = getDb();
  const rows = await db.select().from(jobs).where(eq(jobs.userId, userId)).orderBy(desc(jobs.updatedAt));
  return rows.map((r) => toSnake(r));
}

async function getById(userId: string, id: string) {
  const db = getDb();
  const [row] = await db.select().from(jobs).where(and(eq(jobs.id, id), eq(jobs.userId, userId))).limit(1);
  return row ? toSnake(row) : null;
}

async function insert(userId: string, row: Record<string, unknown>) {
  const db = getDb();
  const mapped = fromSnake(row);
  delete mapped.userId;
  const [created] = await db
    .insert(jobs)
    .values({ ...mapped, userId } as typeof jobs.$inferInsert)
    .returning();
  return toSnake(created);
}

async function update(userId: string, id: string, patch: Record<string, unknown>) {
  const db = getDb();
  const mapped = fromSnake(patch);
  delete mapped.id;
  delete mapped.userId;
  const [updated] = await db
    .update(jobs)
    .set(mapped as Partial<typeof jobs.$inferInsert>)
    .where(and(eq(jobs.id, id), eq(jobs.userId, userId)))
    .returning();
  if (!updated) throw new Error('Job not found');
  return toSnake(updated);
}

async function remove(userId: string, id: string) {
  const db = getDb();
  await db.delete(jobs).where(and(eq(jobs.id, id), eq(jobs.userId, userId)));
}

export function getJobsRepo() {
  return { listByUser, getById, insert, update, remove };
}
