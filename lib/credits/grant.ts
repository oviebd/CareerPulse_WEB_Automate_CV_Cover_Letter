import { getCreditsRepo } from '@/lib/db/repositories/credits';

export async function grantInitialCredits(userId: string): Promise<number> {
  const repo = getCreditsRepo();
  const hasTxn = await repo.hasAnyTransaction(userId);
  if (hasTxn) return repo.getBalance(userId);

  const amount = await repo.getInitialFreeCredits();
  if (amount <= 0) {
    await repo.ensureBalanceRow(userId);
    return 0;
  }

  const { balance } = await repo.grantCredits({
    userId,
    amount,
    type: 'initial_grant',
    description: 'Welcome credits for new account',
    source: 'registration',
  });
  return balance;
}

export async function ensureUserCredits(userId: string): Promise<number> {
  return grantInitialCredits(userId);
}
