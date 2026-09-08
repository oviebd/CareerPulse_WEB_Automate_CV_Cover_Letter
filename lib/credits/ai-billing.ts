import {
  calculateCreditsFromTokens,
  estimateCreditsFromPrompt,
  toRuleSnapshot,
} from '@/lib/credits/calculator';
import { getCreditsRepo } from '@/lib/db/repositories/credits';
import { getCharsPerToken } from '@/lib/ai/token-estimate';
import { assertFeatureAccess, FeatureDisabledError } from '@/lib/access/user-permissions';
import { Feature } from '@/lib/access/feature-flags';
import type { CreditRuleInput } from '@/lib/credits/calculator';

export class InsufficientCreditsError extends Error {
  constructor(public balance: number) {
    super('INSUFFICIENT_CREDITS');
    this.name = 'InsufficientCreditsError';
  }
}

export async function chargeAiUsageFromTokens(opts: {
  userId: string;
  inputTokens: number;
  outputTokens: number;
  feature: string;
  aiUsageId?: string;
}): Promise<{ creditsConsumed: number; balance: number }> {
  try {
    await assertFeatureAccess(opts.userId, Feature.AI_GENERATION);
  } catch (err) {
    if (err instanceof FeatureDisabledError) throw err;
    throw err;
  }

  const repo = getCreditsRepo();
  const rule = await repo.getActiveRule();
  const actualCredits = calculateCreditsFromTokens(
    opts.inputTokens,
    opts.outputTokens,
    rule as CreditRuleInput
  );

  if (actualCredits <= 0) {
    return { creditsConsumed: 0, balance: await repo.getBalance(opts.userId) };
  }

  const balance = await repo.getBalance(opts.userId);
  if (balance < actualCredits) throw new InsufficientCreditsError(balance);

  const reservation = await repo.reserveCredits({
    userId: opts.userId,
    amount: actualCredits,
    description: opts.feature,
  });

  const after = await repo.settleReservation({
    userId: opts.userId,
    reservationId: reservation.reservationId,
    actualCredits,
    aiUsageId: opts.aiUsageId,
    ruleSnapshot: {
      ...toRuleSnapshot(rule),
      input_tokens: opts.inputTokens,
      output_tokens: opts.outputTokens,
    } as unknown as Record<string, unknown>,
    description: opts.feature,
  });

  console.info('[ai-billing]', {
    user_id: opts.userId,
    feature: opts.feature,
    input_tokens: opts.inputTokens,
    output_tokens: opts.outputTokens,
    credits: actualCredits,
    success: true,
    mode: 'post_charge',
  });

  return { creditsConsumed: actualCredits, balance: after };
}

export async function withCreditBilling<T>(opts: {
  userId: string;
  inputText: string;
  maxOutputTokens: number;
  feature: string;
  fn: () => Promise<
    T & { inputTokens: number; outputTokens: number; model: string; aiUsageId?: string | null }
  >;
}): Promise<T & { inputTokens: number; outputTokens: number; model: string; creditsConsumed: number }> {
  try {
    await assertFeatureAccess(opts.userId, Feature.AI_GENERATION);
  } catch (err) {
    if (err instanceof FeatureDisabledError) throw err;
    throw err;
  }

  const repo = getCreditsRepo();
  const rule = await repo.getActiveRule();
  const estimated = estimateCreditsFromPrompt(
    opts.inputText,
    opts.maxOutputTokens,
    rule,
    getCharsPerToken()
  );

  let reservationId = '';
  if (estimated > 0) {
    const balance = await repo.getBalance(opts.userId);
    if (balance < estimated) throw new InsufficientCreditsError(balance);
    const reservation = await repo.reserveCredits({
      userId: opts.userId,
      amount: estimated,
      description: opts.feature,
    });
    reservationId = reservation.reservationId;
  }

  const started = Date.now();
  try {
    const result = await opts.fn();
    const actualCredits = calculateCreditsFromTokens(
      result.inputTokens,
      result.outputTokens,
      rule as CreditRuleInput
    );

    if (reservationId) {
      if (actualCredits > 0) {
        await repo.settleReservation({
          userId: opts.userId,
          reservationId,
          actualCredits,
          aiUsageId: result.aiUsageId ?? undefined,
          ruleSnapshot: toRuleSnapshot(rule) as unknown as Record<string, unknown>,
          description: opts.feature,
        });
      } else {
        await repo.releaseReservation(reservationId, opts.userId);
      }
    }

    console.info('[ai-billing]', {
      user_id: opts.userId,
      feature: opts.feature,
      model: result.model,
      input_tokens: result.inputTokens,
      output_tokens: result.outputTokens,
      credits: actualCredits,
      duration_ms: Date.now() - started,
      success: true,
    });

    return { ...result, creditsConsumed: actualCredits };
  } catch (err) {
    if (reservationId) {
      await repo.releaseReservation(reservationId, opts.userId).catch(console.error);
    }
    console.info('[ai-billing]', {
      user_id: opts.userId,
      feature: opts.feature,
      duration_ms: Date.now() - started,
      success: false,
    });
    throw err;
  }
}
