import { desc, eq, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import {
  creditBalances,
  creditRuleVersions,
  creditTransactions,
  systemSettings,
} from '@/lib/db/schema';
import { toSnake, rowsToSnake } from '@/lib/db/map-row';
import type {
  CreditRuleVersion,
  CreditTransaction,
  CreditTransactionType,
} from '@/types';
import type { CreditRuleInput } from '@/lib/credits/calculator';

const DEFAULT_INITIAL_CREDITS = 150;

async function lockBalance(tx: Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0], userId: string) {
  const [row] = await tx
    .select()
    .from(creditBalances)
    .where(eq(creditBalances.userId, userId))
    .for('update');
  return row?.balance ?? 0;
}

async function getActiveRule(): Promise<CreditRuleInput & { id: string }> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(creditRuleVersions)
    .where(eq(creditRuleVersions.isActive, true))
    .limit(1);
  if (!row) {
    return {
      id: 'default',
      input_token_unit: 1000,
      input_token_credits: 1,
      output_token_unit: 1000,
      output_token_credits: 5,
    };
  }
  return {
    id: row.id,
    input_token_unit: row.inputTokenUnit,
    input_token_credits: row.inputTokenCredits,
    output_token_unit: row.outputTokenUnit,
    output_token_credits: row.outputTokenCredits,
  };
}

async function getInitialFreeCredits(): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, 'initial_free_credits'))
    .limit(1);
  const val = row?.value;
  if (typeof val === 'number' && Number.isFinite(val)) return Math.max(0, Math.round(val));
  return DEFAULT_INITIAL_CREDITS;
}

async function getBalance(userId: string): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(creditBalances)
    .where(eq(creditBalances.userId, userId))
    .limit(1);
  return row?.balance ?? 0;
}

async function ensureBalanceRow(userId: string) {
  const db = getDb();
  await db
    .insert(creditBalances)
    .values({ userId, balance: 0 })
    .onConflictDoNothing();
}

async function listTransactions(
  userId: string,
  opts?: { limit?: number; offset?: number }
): Promise<CreditTransaction[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(creditTransactions)
    .where(eq(creditTransactions.userId, userId))
    .orderBy(desc(creditTransactions.createdAt))
    .limit(opts?.limit ?? 50)
    .offset(opts?.offset ?? 0);
  return rowsToSnake(rows) as unknown as CreditTransaction[];
}

async function hasAnyTransaction(userId: string): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select({ id: creditTransactions.id })
    .from(creditTransactions)
    .where(eq(creditTransactions.userId, userId))
    .limit(1);
  return Boolean(row);
}

async function grantCredits(input: {
  userId: string;
  amount: number;
  type: CreditTransactionType;
  description?: string;
  source?: string;
  referenceId?: string;
  createdBy?: string;
}): Promise<{ balance: number; transaction: CreditTransaction | null }> {
  if (input.amount <= 0) {
    return { balance: await getBalance(input.userId), transaction: null };
  }
  const db = getDb();
  return db.transaction(async (tx) => {
    await tx.insert(creditBalances).values({ userId: input.userId, balance: 0 }).onConflictDoNothing();
    const before = await lockBalance(tx, input.userId);
    const after = before + input.amount;
    await tx.update(creditBalances).set({ balance: after, updatedAt: new Date() }).where(eq(creditBalances.userId, input.userId));
    const [txnRow] = await tx.insert(creditTransactions).values({
      userId: input.userId,
      type: input.type,
      amount: input.amount,
      balanceBefore: before,
      balanceAfter: after,
      source: input.source ?? null,
      referenceId: input.referenceId ?? null,
      description: input.description ?? null,
      createdBy: input.createdBy ?? null,
    }).returning();
    return { balance: after, transaction: txnRow ? (toSnake(txnRow) as unknown as CreditTransaction) : null };
  });
}

async function reserveCredits(input: {
  userId: string;
  amount: number;
  referenceId?: string;
  description?: string;
}): Promise<{ reservationId: string; balance: number }> {
  if (input.amount <= 0) {
    return { reservationId: '', balance: await getBalance(input.userId) };
  }
  const db = getDb();
  return db.transaction(async (tx) => {
    await tx.insert(creditBalances).values({ userId: input.userId, balance: 0 }).onConflictDoNothing();
    const before = await lockBalance(tx, input.userId);
    if (before < input.amount) throw new Error('INSUFFICIENT_CREDITS');
    const after = before - input.amount;
    await tx.update(creditBalances).set({ balance: after, updatedAt: new Date() }).where(eq(creditBalances.userId, input.userId));
    const [txnRow] = await tx.insert(creditTransactions).values({
      userId: input.userId,
      type: 'reservation',
      amount: -input.amount,
      balanceBefore: before,
      balanceAfter: after,
      referenceId: input.referenceId ?? null,
      description: input.description ?? 'AI credit reservation',
    }).returning();
    return { reservationId: txnRow!.id, balance: after };
  });
}

async function releaseReservation(reservationId: string, userId: string): Promise<number> {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [reservation] = await tx.select().from(creditTransactions).where(eq(creditTransactions.id, reservationId)).limit(1);
    if (!reservation || reservation.userId !== userId || reservation.type !== 'reservation') {
      return getBalance(userId);
    }
    const refundAmount = Math.abs(reservation.amount);
    const before = await lockBalance(tx, userId);
    const after = before + refundAmount;
    await tx.update(creditBalances).set({ balance: after, updatedAt: new Date() }).where(eq(creditBalances.userId, userId));
    await tx.insert(creditTransactions).values({
      userId,
      type: 'reservation_release',
      amount: refundAmount,
      balanceBefore: before,
      balanceAfter: after,
      referenceId: reservationId,
      description: 'Released unused AI credit reservation',
    });
    return after;
  });
}

async function settleReservation(input: {
  userId: string;
  reservationId: string;
  actualCredits: number;
  aiUsageId?: string;
  ruleSnapshot?: Record<string, unknown>;
  description?: string;
}): Promise<number> {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [reservation] = await tx.select().from(creditTransactions).where(eq(creditTransactions.id, input.reservationId)).limit(1);
    if (!reservation || reservation.userId !== input.userId) throw new Error('RESERVATION_NOT_FOUND');

    const reserved = Math.abs(reservation.amount);
    const actual = Math.max(0, input.actualCredits);
    const diff = reserved - actual;
    let before = await lockBalance(tx, input.userId);
    let balance = before;

    if (diff > 0) {
      balance = before + diff;
      await tx.update(creditBalances).set({ balance, updatedAt: new Date() }).where(eq(creditBalances.userId, input.userId));
      await tx.insert(creditTransactions).values({
        userId: input.userId,
        type: 'refund',
        amount: diff,
        balanceBefore: before,
        balanceAfter: balance,
        referenceId: input.reservationId,
        description: 'Partial reservation refund after AI usage',
      });
    } else if (diff < 0) {
      const extra = Math.abs(diff);
      if (before < extra) throw new Error('INSUFFICIENT_CREDITS');
      balance = before - extra;
      await tx.update(creditBalances).set({ balance, updatedAt: new Date() }).where(eq(creditBalances.userId, input.userId));
    }

    await tx.insert(creditTransactions).values({
      userId: input.userId,
      type: 'ai_usage',
      amount: -actual,
      balanceBefore: balance + (diff < 0 ? Math.abs(diff) : 0),
      balanceAfter: balance,
      aiUsageId: input.aiUsageId ?? null,
      referenceId: input.reservationId,
      description: input.description ?? 'AI usage',
      ruleSnapshot: input.ruleSnapshot ?? null,
    });
    return balance;
  });
}

async function adjustCredits(input: {
  userId: string;
  amount: number;
  description: string;
  createdBy: string;
}): Promise<{ balance: number; transaction: CreditTransaction | null }> {
  const type: CreditTransactionType = input.amount >= 0 ? 'admin_grant' : 'admin_adjust';
  const db = getDb();
  return db.transaction(async (tx) => {
    await tx.insert(creditBalances).values({ userId: input.userId, balance: 0 }).onConflictDoNothing();
    const before = await lockBalance(tx, input.userId);
    const after = before + input.amount;
    if (after < 0) throw new Error('NEGATIVE_BALANCE');
    await tx.update(creditBalances).set({ balance: after, updatedAt: new Date() }).where(eq(creditBalances.userId, input.userId));
    const [txnRow] = await tx.insert(creditTransactions).values({
      userId: input.userId,
      type,
      amount: input.amount,
      balanceBefore: before,
      balanceAfter: after,
      description: input.description,
      createdBy: input.createdBy,
      source: 'admin',
    }).returning();
    return { balance: after, transaction: txnRow ? (toSnake(txnRow) as unknown as CreditTransaction) : null };
  });
}

async function listRuleVersions(): Promise<CreditRuleVersion[]> {
  const db = getDb();
  const rows = await db.select().from(creditRuleVersions).orderBy(desc(creditRuleVersions.createdAt));
  return rowsToSnake(rows) as unknown as CreditRuleVersion[];
}

async function saveCreditRule(input: {
  input_token_unit: number;
  input_token_credits: number;
  output_token_unit: number;
  output_token_credits: number;
  createdBy?: string;
}): Promise<CreditRuleVersion> {
  const db = getDb();
  return db.transaction(async (tx) => {
    await tx.update(creditRuleVersions).set({ isActive: false }).where(eq(creditRuleVersions.isActive, true));
    const [row] = await tx.insert(creditRuleVersions).values({
      inputTokenUnit: input.input_token_unit,
      inputTokenCredits: input.input_token_credits,
      outputTokenUnit: input.output_token_unit,
      outputTokenCredits: input.output_token_credits,
      isActive: true,
      createdBy: input.createdBy ?? null,
    }).returning();
    return toSnake(row) as unknown as CreditRuleVersion;
  });
}

async function setInitialFreeCredits(amount: number, updatedBy?: string) {
  const db = getDb();
  await db.insert(systemSettings).values({
    key: 'initial_free_credits',
    value: amount,
    updatedBy: updatedBy ?? null,
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: systemSettings.key,
    set: { value: amount, updatedBy: updatedBy ?? null, updatedAt: new Date() },
  });
}

async function countSuperAdmins(): Promise<number> {
  const db = getDb();
  const [row] = await db.execute<{ count: string }>(
    sql`SELECT count(*)::text AS count FROM users WHERE role = 'super_admin'`
  );
  return Number(row?.count ?? 0);
}

export function getCreditsRepo() {
  return {
    getActiveRule,
    getInitialFreeCredits,
    getBalance,
    ensureBalanceRow,
    listTransactions,
    hasAnyTransaction,
    grantCredits,
    reserveCredits,
    releaseReservation,
    settleReservation,
    adjustCredits,
    listRuleVersions,
    saveCreditRule,
    setInitialFreeCredits,
    countSuperAdmins,
  };
}
