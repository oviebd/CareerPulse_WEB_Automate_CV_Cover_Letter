import { desc, eq, ilike, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import {
  users,
  profiles,
  creditBalances,
  creditTransactions,
  aiUsageEvents,
} from '@/lib/db/schema';
import { toSnake, rowsToSnake } from '@/lib/db/map-row';

async function listUsers(opts?: { search?: string; limit?: number; offset?: number }) {
  const db = getDb();
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;
  const search = opts?.search?.trim();

  const base = db
    .select({
      id: users.id,
      email: users.email,
      full_name: users.fullName,
      role: users.role,
      is_active: users.isActive,
      created_at: users.createdAt,
      subscription_tier: profiles.subscriptionTier,
      subscription_status: profiles.subscriptionStatus,
      balance: sql<number>`coalesce(${creditBalances.balance}, 0)`.mapWith(Number),
    })
    .from(users)
    .innerJoin(profiles, eq(profiles.id, users.id))
    .leftJoin(creditBalances, eq(creditBalances.userId, users.id));

  const rows = search
    ? await base
        .where(ilike(users.email, `%${search}%`))
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset)
    : await base.orderBy(desc(users.createdAt)).limit(limit).offset(offset);

  return rows;
}

async function getUserDetail(userId: string) {
  const db = getDb();
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      full_name: users.fullName,
      role: users.role,
      is_active: users.isActive,
      created_at: users.createdAt,
      subscription_tier: profiles.subscriptionTier,
      subscription_status: profiles.subscriptionStatus,
      subscription_expires_at: profiles.subscriptionExpiresAt,
      promo_code_used: profiles.promoCodeUsed,
      can_use_ai: profiles.canUseAi,
      can_create_documents: profiles.canCreateDocuments,
      can_use_interview_prep: profiles.canUseInterviewPrep,
      balance: sql<number>`coalesce(${creditBalances.balance}, 0)`.mapWith(Number),
    })
    .from(users)
    .innerJoin(profiles, eq(profiles.id, users.id))
    .leftJoin(creditBalances, eq(creditBalances.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);
  return row ?? null;
}

async function updateUserRole(userId: string, role: string) {
  const db = getDb();
  const [row] = await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, userId)).returning();
  return row ? toSnake(row) : null;
}

async function updateUserActive(userId: string, isActive: boolean) {
  const db = getDb();
  const [row] = await db
    .update(users)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  return row ? toSnake(row) : null;
}

async function dashboardStats() {
  const db = getDb();
  const [usersRow] = await db.execute<{ total: string; free: string; premium: string }>(sql`
    SELECT
      count(*)::text AS total,
      count(*) FILTER (WHERE subscription_tier = 'free')::text AS free,
      count(*) FILTER (WHERE subscription_tier = 'pro')::text AS premium
    FROM profiles
  `);
  const [aiRow] = await db.execute<{ requests: string; credits: string }>(sql`
    SELECT
      count(*)::text AS requests,
      coalesce(sum(credits_consumed), 0)::text AS credits
    FROM ai_usage_events
  `);
  return {
    total_users: Number(usersRow?.total ?? 0),
    free_users: Number(usersRow?.free ?? 0),
    premium_users: Number(usersRow?.premium ?? 0),
    total_ai_requests: Number(aiRow?.requests ?? 0),
    total_credits_consumed: Number(aiRow?.credits ?? 0),
  };
}

async function listAiUsage(opts?: { limit?: number; offset?: number; userId?: string }) {
  const db = getDb();
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;

  const base = db
    .select({
      id: aiUsageEvents.id,
      user_id: aiUsageEvents.userId,
      user_email: users.email,
      category: aiUsageEvents.category,
      operation: aiUsageEvents.operation,
      input_chars: aiUsageEvents.inputChars,
      output_chars: aiUsageEvents.outputChars,
      input_tokens: aiUsageEvents.inputTokens,
      output_tokens: aiUsageEvents.outputTokens,
      provider: aiUsageEvents.provider,
      feature: aiUsageEvents.feature,
      request_id: aiUsageEvents.requestId,
      credits_consumed: aiUsageEvents.creditsConsumed,
      credit_rule_version: aiUsageEvents.creditRuleVersion,
      token_source: aiUsageEvents.tokenSource,
      cached_input_tokens: aiUsageEvents.cachedInputTokens,
      metadata: aiUsageEvents.metadata,
      created_at: aiUsageEvents.createdAt,
      model: aiUsageEvents.model,
    })
    .from(aiUsageEvents)
    .innerJoin(profiles, eq(profiles.id, aiUsageEvents.userId))
    .innerJoin(users, eq(users.id, profiles.id))
    .orderBy(desc(aiUsageEvents.createdAt))
    .limit(limit)
    .offset(offset);

  const rows = opts?.userId
    ? await base.where(eq(aiUsageEvents.userId, opts.userId))
    : await base;

  return rowsToSnake(rows);
}

export function getAdminRepo() {
  return {
    listUsers,
    getUserDetail,
    updateUserRole,
    updateUserActive,
    dashboardStats,
    listAiUsage,
  };
}
