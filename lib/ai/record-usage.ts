import { getCharsPerToken, estimateTokensFromText } from '@/lib/ai/token-estimate';
import { getAiUsageContext, type AiUsageCategory } from '@/lib/ai/usage-context';
import { calculateCreditsFromTokens, toRuleSnapshot } from '@/lib/credits/calculator';
import { getCreditsRepo } from '@/lib/db/repositories/credits';
import { getAiUsageRepo } from '@/lib/db/repositories/ai-usage';
import { computeAnthropicUsdCost } from '@/lib/ai/anthropic-pricing';

export type RecordAiUsageInput = {
  inputText: string;
  outputText: string;
  inputTokens?: number;
  outputTokens?: number;
  category?: AiUsageCategory;
  operation?: string;
  userId?: string;
  relatedId?: string;
  model?: string;
  promptVersion?: string;
  tokenSource?: 'api' | 'estimated';
  feature?: string;
  creditsConsumed?: number;
  requestId?: string;
  cacheCreationInputTokens?: number;
  cacheReadInputTokens?: number;
  usdCost?: number;
  pricingRates?: Record<string, number>;
};

export async function recordAiUsage(input: RecordAiUsageInput): Promise<string | null> {
  try {
    const ctx = getAiUsageContext();
    const userId = input.userId ?? ctx.userId;
    const category = input.category ?? ctx.category;
    const operation = input.operation ?? ctx.operation;

    if (!userId || !category || !operation) {
      console.warn('recordAiUsage skipped — missing context', {
        userId: Boolean(userId),
        category,
        operation,
      });
      return null;
    }

    const charsPerToken = getCharsPerToken();
    const inputChars = input.inputText.length;
    const outputChars = input.outputText.length;

    let inputTokens: number;
    let outputTokens: number;
    if (input.tokenSource === 'api') {
      if (
        input.inputTokens == null ||
        input.outputTokens == null ||
        !Number.isFinite(input.inputTokens) ||
        !Number.isFinite(input.outputTokens)
      ) {
        throw new Error('recordAiUsage: tokenSource api requires inputTokens and outputTokens');
      }
      inputTokens = Math.max(0, Math.floor(input.inputTokens));
      outputTokens = Math.max(0, Math.floor(input.outputTokens));
    } else {
      inputTokens =
        input.inputTokens ?? estimateTokensFromText(input.inputText, charsPerToken);
      outputTokens =
        input.outputTokens ?? estimateTokensFromText(input.outputText, charsPerToken);
    }

    let creditsConsumed = input.creditsConsumed ?? 0;
    let ruleVersionId: string | null = null;
    let ruleSnapshot = null;

    if (creditsConsumed <= 0) {
      const repo = getCreditsRepo();
      const rule = await repo.getActiveRule();
      creditsConsumed = calculateCreditsFromTokens(inputTokens, outputTokens, rule);
      ruleVersionId = rule.id !== 'default' ? rule.id : null;
      ruleSnapshot = toRuleSnapshot(rule);
    }

    const feature = input.feature ?? `${category}:${operation}`;

    const metadata: Record<string, unknown> = {};
    if (ruleSnapshot) metadata.rule_snapshot = ruleSnapshot;

    let usdCost = input.usdCost;
    let pricingRates = input.pricingRates;
    if (usdCost == null && input.model) {
      const computed = computeAnthropicUsdCost({
        model: input.model,
        inputTokens,
        outputTokens,
        cacheCreationInputTokens: input.cacheCreationInputTokens,
        cacheReadInputTokens: input.cacheReadInputTokens,
      });
      usdCost = computed.usd;
      pricingRates = pricingRates ?? computed.rates;
    }
    if (pricingRates) metadata.pricing = pricingRates;

    const row = await getAiUsageRepo().insertEvent({
      user_id: userId,
      category,
      operation,
      input_chars: inputChars,
      output_chars: outputChars,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      chars_per_token: charsPerToken,
      model: input.model ?? null,
      prompt_version: input.promptVersion ?? null,
      related_id: input.relatedId ?? ctx.relatedId ?? null,
      provider: 'anthropic',
      feature,
      request_id: input.requestId ?? null,
      credits_consumed: creditsConsumed,
      credit_rule_version: ruleVersionId,
      token_source: input.tokenSource ?? 'api',
      cached_input_tokens: input.cacheReadInputTokens ?? 0,
      cache_creation_input_tokens: input.cacheCreationInputTokens ?? 0,
      usd_cost: usdCost ?? 0,
      metadata,
    });

    return (row?.id as string | undefined) ?? null;
  } catch (e) {
    console.error('recordAiUsage failed', e);
    return null;
  }
}
