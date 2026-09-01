import { asc, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { cvTemplates } from '@/lib/db/schema';
import { toSnake } from '@/lib/db/map-row';
import type { CVTemplate } from '@/types';

export async function listTemplatesByType(type: 'cv' | 'cover_letter'): Promise<CVTemplate[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(cvTemplates)
    .where(eq(cvTemplates.type, type))
    .orderBy(asc(cvTemplates.sortOrder));
  return rows.map((r) => toSnake(r) as unknown as CVTemplate);
}

async function getById(id: string): Promise<CVTemplate | null> {
  const db = getDb();
  const [row] = await db.select().from(cvTemplates).where(eq(cvTemplates.id, id)).limit(1);
  return row ? (toSnake(row) as unknown as CVTemplate) : null;
}

export function getTemplatesRepo() {
  return { listByType: listTemplatesByType, getById };
}
