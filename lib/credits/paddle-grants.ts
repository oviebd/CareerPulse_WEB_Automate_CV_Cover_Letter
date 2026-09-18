import { getCreditsRepo } from '@/lib/db/repositories/credits';
import { CREDIT_PACKS, type CreditPackKey } from '@/lib/paddle/packs';
import type { CreditTransactionType } from '@/types';

export const PRO_SUBSCRIPTION_SAFETY_CREDITS = 700;

function paddleGrantDescription(paddleTransactionId: string): string {
  return `paddle_txn:${paddleTransactionId}`;
}

export async function hasPaddleCreditGrant(
  userId: string,
  paddleTransactionId: string
): Promise<boolean> {
  const key = paddleGrantDescription(paddleTransactionId);
  const txns = await getCreditsRepo().listTransactions(userId, { limit: 200 });
  return txns.some((t) => t.description === key);
}

export async function grantCreditsForPaddleTransaction(input: {
  userId: string;
  paddleTransactionId: string;
  amount: number;
  type: CreditTransactionType;
  detail: string;
}): Promise<boolean> {
  if (input.amount <= 0) return false;
  const already = await hasPaddleCreditGrant(input.userId, input.paddleTransactionId);
  if (already) return false;

  await getCreditsRepo().grantCredits({
    userId: input.userId,
    amount: input.amount,
    type: input.type,
    description: paddleGrantDescription(input.paddleTransactionId),
    source: 'paddle',
    referenceId: undefined,
  });
  return true;
}

export async function applyCreditPackGrant(
  userId: string,
  packKey: CreditPackKey,
  paddleTransactionId: string
): Promise<boolean> {
  const pack = CREDIT_PACKS[packKey];
  return grantCreditsForPaddleTransaction({
    userId,
    paddleTransactionId,
    amount: pack.credits,
    type: 'credit_purchase',
    detail: pack.label,
  });
}

export async function grantProSubscriptionSafetyCredits(
  userId: string,
  paddleTransactionId: string
): Promise<boolean> {
  return grantCreditsForPaddleTransaction({
    userId,
    paddleTransactionId,
    amount: PRO_SUBSCRIPTION_SAFETY_CREDITS,
    type: 'subscription_grant',
    detail: 'Pro monthly safety credits',
  });
}
