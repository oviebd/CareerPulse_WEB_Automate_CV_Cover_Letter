import { getCharsPerToken, estimateTokensFromText } from '@/lib/ai/token-estimate';
import { getAiUsageContext, type AiUsageCategory } from '@/lib/ai/usage-context';
import { calculateCreditsFromTokens, toRuleSnapshot } from '@/lib/credits/calculator';
import { getCreditsRepo } from '@/lib/db/repositories/credits';
import { getAiUsageRepo } from '@/lib/db/repositories/ai-usage';

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
    const inputTokens =
      input.inputTokens ?? estimateTokensFromText(input.inputText, charsPerToken);
    const outputTokens =
      input.outputTokens ?? estimateTokensFromText(input.outputText, charsPerToken);

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
      metadata: ruleSnapshot ? { rule_snapshot: ruleSnapshot } : {},
    });

    return (row?.id as string | undefined) ?? null;
  } catch (e) {
    console.error('recordAiUsage failed', e);
    return null;
  }
}
