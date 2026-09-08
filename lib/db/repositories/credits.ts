import { desc, eq, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import {
  creditBalances,
  creditRuleVersions,
  creditTransactions,
  systemSettings,
  aiUsageEvents,
} from '@/lib/db/schema';
import { toSnake, rowsToSnake } from '@/lib/db/map-row';
import type {
  CreditRuleVersion,
  CreditTransaction,
  CreditTransactionType,
} from '@/types';
import { roundCredits, type CreditRuleInput } from '@/lib/credits/calculator';

const DEFAULT_INITIAL_CREDITS = 150;

function asCredit(value: unknown): number {
  return roundCredits(Number(value ?? 0));
}

function creditValue(value: number): string {
  return roundCredits(value).toFixed(4);
}

function toCreditTransaction(
  row: Record<string, unknown>,
  usage?: { inputTokens?: number | null; outputTokens?: number | null }
): CreditTransaction {
  const snake = toSnake(row);
  const snapshot = snake.rule_snapshot as Record<string, unknown> | null;
  const snapshotInput =
    typeof snapshot?.input_tokens === 'number' ? snapshot.input_tokens : undefined;
  const snapshotOutput =
    typeof snapshot?.output_tokens === 'number' ? snapshot.output_tokens : undefined;
  const inputTokens = snapshotInput ?? usage?.inputTokens ?? null;
  const outputTokens = snapshotOutput ?? usage?.outputTokens ?? null;

  return {
    ...(snake as unknown as CreditTransaction),
    amount: asCredit(snake.amount),
    balance_before: asCredit(snake.balance_before),
    balance_after: asCredit(snake.balance_after),
    input_tokens: inputTokens,
    output_tokens: outputTokens,
  };
}

async function lockBalance(tx: Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0], userId: string) {
  const [row] = await tx
    .select()
    .from(creditBalances)
    .where(eq(creditBalances.userId, userId))
    .for('update');
  return asCredit(row?.balance);
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
    input_token_credits: asCredit(row.inputTokenCredits),
    output_token_unit: row.outputTokenUnit,
    output_token_credits: asCredit(row.outputTokenCredits),
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
  if (typeof val === 'number' && Number.isFinite(val)) return Math.max(0, roundCredits(val));
  if (typeof val === 'string' && Number.isFinite(Number(val))) return Math.max(0, roundCredits(Number(val)));
  return DEFAULT_INITIAL_CREDITS;
}

async function getBalance(userId: string): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(creditBalances)
    .where(eq(creditBalances.userId, userId))
    .limit(1);
  return asCredit(row?.balance);
}

async function ensureBalanceRow(userId: string) {
  const db = getDb();
  await db
    .insert(creditBalances)
    .values({ userId, balance: '0' })
    .onConflictDoNothing();
}

async function listTransactions(
  userId: string,
  opts?: { limit?: number; offset?: number }
): Promise<CreditTransaction[]> {
  const db = getDb();
  const rows = await db
    .select({
      txn: creditTransactions,
      inputTokens: aiUsageEvents.inputTokens,
      outputTokens: aiUsageEvents.outputTokens,
    })
    .from(creditTransactions)
    .leftJoin(aiUsageEvents, eq(creditTransactions.aiUsageId, aiUsageEvents.id))
    .where(eq(creditTransactions.userId, userId))
    .orderBy(desc(creditTransactions.createdAt))
    .limit(opts?.limit ?? 50)
    .offset(opts?.offset ?? 0);

  return rows.map(({ txn, inputTokens, outputTokens }) =>
    toCreditTransaction(txn as Record<string, unknown>, {
      inputTokens,
      outputTokens,
    })
  );
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
    await tx.insert(creditBalances).values({ userId: input.userId, balance: '0' }).onConflictDoNothing();
    const before = await lockBalance(tx, input.userId);
    const amount = roundCredits(input.amount);
    const after = roundCredits(before + amount);
    await tx.update(creditBalances).set({ balance: creditValue(after), updatedAt: new Date() }).where(eq(creditBalances.userId, input.userId));
    const [txnRow] = await tx.insert(creditTransactions).values({
      userId: input.userId,
      type: input.type,
      amount: creditValue(amount),
      balanceBefore: creditValue(before),
      balanceAfter: creditValue(after),
      source: input.source ?? null,
      referenceId: input.referenceId ?? null,
      description: input.description ?? null,
      createdBy: input.createdBy ?? null,
    }).returning();
    return { balance: after, transaction: txnRow ? toCreditTransaction(txnRow as Record<string, unknown>) : null };
  });
}

async function reserveCredits(input: {
  userId: string;
  amount: number;
  referenceId?: string;
  description?: string;
}): Promise<{ reservationId: string; balance: number }> {
  const amount = roundCredits(input.amount);
  if (amount <= 0) {
    return { reservationId: '', balance: await getBalance(input.userId) };
  }
  const db = getDb();
  return db.transaction(async (tx) => {
    await tx.insert(creditBalances).values({ userId: input.userId, balance: '0' }).onConflictDoNothing();
    const before = await lockBalance(tx, input.userId);
    if (before < amount) throw new Error('INSUFFICIENT_CREDITS');
    const after = roundCredits(before - amount);
    await tx.update(creditBalances).set({ balance: creditValue(after), updatedAt: new Date() }).where(eq(creditBalances.userId, input.userId));
    const [txnRow] = await tx.insert(creditTransactions).values({
      userId: input.userId,
      type: 'reservation',
      amount: creditValue(-amount),
      balanceBefore: creditValue(before),
      balanceAfter: creditValue(after),
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
    const reserved = Math.abs(asCredit(reservation.amount));
    const before = await lockBalance(tx, userId);
    const after = roundCredits(before + reserved);
    await tx.update(creditBalances).set({ balance: creditValue(after), updatedAt: new Date() }).where(eq(creditBalances.userId, userId));
    await tx.delete(creditTransactions).where(eq(creditTransactions.id, reservationId));
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
    if (reservation.type !== 'reservation') {
      return lockBalance(tx, input.userId);
    }

    const reserved = Math.abs(asCredit(reservation.amount));
    const actual = roundCredits(Math.max(0, input.actualCredits));
    const current = await lockBalance(tx, input.userId);
    const after = roundCredits(current + reserved - actual);
    if (after < 0) throw new Error('INSUFFICIENT_CREDITS');

    await tx.update(creditBalances).set({
      balance: creditValue(after),
      updatedAt: new Date(),
    }).where(eq(creditBalances.userId, input.userId));

    await tx.update(creditTransactions).set({
      type: 'ai_usage',
      amount: creditValue(-actual),
      balanceBefore: creditValue(current + reserved),
      balanceAfter: creditValue(after),
      aiUsageId: input.aiUsageId ?? null,
      description: input.description ?? 'AI usage',
      ruleSnapshot: input.ruleSnapshot ?? null,
    }).where(eq(creditTransactions.id, input.reservationId));

    return after;
  });
}

async function adjustCredits(input: {
  userId: string;
  amount: number;
  description: string;
  createdBy: string;
}): Promise<{ balance: number; transaction: CreditTransaction | null }> {
  const type: CreditTransactionType = input.amount >= 0 ? 'admin_grant' : 'admin_adjust';
  const amount = roundCredits(input.amount);
  const db = getDb();
  return db.transaction(async (tx) => {
    await tx.insert(creditBalances).values({ userId: input.userId, balance: '0' }).onConflictDoNothing();
    const before = await lockBalance(tx, input.userId);
    const after = roundCredits(before + amount);
    if (after < 0) throw new Error('NEGATIVE_BALANCE');
    await tx.update(creditBalances).set({ balance: creditValue(after), updatedAt: new Date() }).where(eq(creditBalances.userId, input.userId));
    const [txnRow] = await tx.insert(creditTransactions).values({
      userId: input.userId,
      type,
      amount: creditValue(amount),
      balanceBefore: creditValue(before),
      balanceAfter: creditValue(after),
      description: input.description,
      createdBy: input.createdBy,
      source: 'admin',
    }).returning();
    return { balance: after, transaction: txnRow ? toCreditTransaction(txnRow as Record<string, unknown>) : null };
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
      inputTokenUnit: Math.max(1, Math.round(input.input_token_unit)),
      inputTokenCredits: creditValue(Math.max(0, input.input_token_credits)),
      outputTokenUnit: Math.max(1, Math.round(input.output_token_unit)),
      outputTokenCredits: creditValue(Math.max(0, input.output_token_credits)),
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
