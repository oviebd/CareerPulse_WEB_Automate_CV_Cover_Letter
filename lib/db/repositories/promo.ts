import { eq, ilike, desc, sql, and } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { promoCodes } from '@/lib/db/schema';
import { toSnake, rowsToSnake } from '@/lib/db/map-row';
import type { PromoCode } from '@/types';

async function findById(id: string): Promise<PromoCode | null> {
  const db = getDb();
  const [row] = await db.select().from(promoCodes).where(eq(promoCodes.id, id)).limit(1);
  return row ? (toSnake(row) as unknown as PromoCode) : null;
}

async function findByCode(code: string): Promise<PromoCode | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(promoCodes)
    .where(ilike(promoCodes.code, code.trim()))
    .limit(1);
  return row ? (toSnake(row) as unknown as PromoCode) : null;
}

async function listAll(): Promise<PromoCode[]> {
  const db = getDb();
  const rows = await db.select().from(promoCodes).orderBy(desc(promoCodes.createdAt));
  return rowsToSnake(rows) as unknown as PromoCode[];
}

async function create(input: {
  code: string;
  is_active?: boolean;
  max_redemptions?: number | null;
  grants_plan?: string | null;
  bonus_credits?: number;
  expires_at?: string | null;
}): Promise<PromoCode> {
  const db = getDb();
  const [row] = await db
    .insert(promoCodes)
    .values({
      code: input.code.trim(),
      isActive: input.is_active ?? true,
      maxRedemptions: input.max_redemptions ?? null,
      grantsPlan: input.grants_plan ?? null,
      bonusCredits: input.bonus_credits ?? 0,
      expiresAt: input.expires_at ? new Date(input.expires_at) : null,
    })
    .returning();
  return toSnake(row) as unknown as PromoCode;
}

async function update(id: string, patch: Partial<{
  is_active: boolean;
  max_redemptions: number | null;
  grants_plan: string | null;
  bonus_credits: number;
  expires_at: string | null;
}>): Promise<PromoCode | null> {
  const db = getDb();
  const dbPatch: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.is_active !== undefined) dbPatch.isActive = patch.is_active;
  if (patch.max_redemptions !== undefined) dbPatch.maxRedemptions = patch.max_redemptions;
  if (patch.grants_plan !== undefined) dbPatch.grantsPlan = patch.grants_plan;
  if (patch.bonus_credits !== undefined) dbPatch.bonusCredits = patch.bonus_credits;
  if (patch.expires_at !== undefined) {
    dbPatch.expiresAt = patch.expires_at ? new Date(patch.expires_at) : null;
  }
  const [row] = await db.update(promoCodes).set(dbPatch).where(eq(promoCodes.id, id)).returning();
  return row ? (toSnake(row) as unknown as PromoCode) : null;
}

async function redeem(id: string): Promise<void> {
  const db = getDb();
  await db
    .update(promoCodes)
    .set({ redemptionCount: sql`${promoCodes.redemptionCount} + 1`, updatedAt: new Date() })
    .where(eq(promoCodes.id, id));
}

async function remove(id: string): Promise<boolean> {
  const db = getDb();
  const result = await db.delete(promoCodes).where(eq(promoCodes.id, id)).returning({ id: promoCodes.id });
  return result.length > 0;
}

export function getPromoRepo() {
  return { findById, findByCode, listAll, create, update, redeem, remove };
}
