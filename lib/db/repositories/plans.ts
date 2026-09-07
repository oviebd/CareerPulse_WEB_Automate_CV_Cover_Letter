import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { plans } from '@/lib/db/schema';
import { toSnake, rowsToSnake } from '@/lib/db/map-row';
import type { Plan } from '@/types';

async function listActive(): Promise<Plan[]> {
  const db = getDb();
  const rows = await db.select().from(plans).where(eq(plans.isActive, true));
  return rowsToSnake(rows) as unknown as Plan[];
}

async function listAll(): Promise<Plan[]> {
  const db = getDb();
  const rows = await db.select().from(plans);
  return rowsToSnake(rows) as unknown as Plan[];
}

async function update(id: string, patch: Partial<{ name: string; description: string | null; is_active: boolean }>): Promise<Plan | null> {
  const db = getDb();
  const dbPatch: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.description !== undefined) dbPatch.description = patch.description;
  if (patch.is_active !== undefined) dbPatch.isActive = patch.is_active;
  const [row] = await db.update(plans).set(dbPatch).where(eq(plans.id, id)).returning();
  return row ? (toSnake(row) as unknown as Plan) : null;
}

export function getPlansRepo() {
  return { listActive, listAll, update };
}
