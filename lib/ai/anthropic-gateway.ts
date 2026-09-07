import Anthropic from '@anthropic-ai/sdk';
import { recordAiUsage } from '@/lib/ai/record-usage';
import { estimateTokensFromText, getCharsPerToken } from '@/lib/ai/token-estimate';
import { getAiUsageContext } from '@/lib/ai/usage-context';
import { calculateCreditsFromTokens } from '@/lib/credits/calculator';
import { withCreditBilling, InsufficientCreditsError } from '@/lib/credits/ai-billing';
import { getCreditsRepo } from '@/lib/db/repositories/credits';
import type { AiUsageCategory } from '@/lib/ai/usage-context';

export const CLAUDE_MODEL =
  process.env.ANTHROPIC_MODEL?.trim() || 'claude-sonnet-4-20250514';

export const INTERVIEW_ANALYZER_MODEL =
  process.env.CV_ANALYZER_API_MODEL?.trim() || 'claude-haiku-4-5-20251001';

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export { InsufficientCreditsError };

function isRetryable(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const o = err as { status?: number; type?: string };
  return o.status === 429 || o.type === 'overloaded_error';
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 30000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      if (!isRetryable(err) || attempt === maxRetries - 1) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error('Max retries exceeded');
}

export type ClaudeCompleteOptions = {
  system: string;
  user: string;
  maxTokens?: number;
  model?: string;
  category?: AiUsageCategory;
  operation?: string;
  userId?: string;
  relatedId?: string;
  promptVersion?: string;
  maxRetries?: number;
  retryDelayMs?: number;
  skipBilling?: boolean;
};

export type ClaudeCompleteResult = {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  creditsConsumed?: number;
};

async function invokeAnthropic(opts: ClaudeCompleteOptions) {
  const model = opts.model ?? CLAUDE_MODEL;
  const inputText = `${opts.system}\n${opts.user}`;

  const message = await withRetry(
    () =>
      claude.messages.create({
        model,
        max_tokens: opts.maxTokens ?? 4096,
        system: opts.system,
        messages: [{ role: 'user', content: opts.user }],
      }),
    opts.maxRetries ?? 3,
    opts.retryDelayMs ?? 30000
  );

  const block = message.content[0];
  const text = block.type === 'text' ? block.text : '';
  const tokenSource =
    message.usage?.input_tokens != null && message.usage?.output_tokens != null
      ? ('api' as const)
      : ('estimated' as const);
  const inputTokens =
    message.usage?.input_tokens ?? estimateTokensFromText(inputText, getCharsPerToken());
  const outputTokens =
    message.usage?.output_tokens ?? estimateTokensFromText(text, getCharsPerToken());

  return { text, model, inputTokens, outputTokens, inputText, tokenSource };
}

export async function claudeComplete(
  opts: ClaudeCompleteOptions
): Promise<ClaudeCompleteResult> {
  const ctx = getAiUsageContext();
  const userId = opts.userId ?? ctx.userId;
  const category = opts.category ?? ctx.category;
  const operation = opts.operation ?? ctx.operation;
  const feature = category && operation ? `${category}:${operation}` : category ?? operation ?? 'ai';
  const inputText = `${opts.system}\n${opts.user}`;
  const maxTokens = opts.maxTokens ?? 4096;

  const persistUsage = async (result: {
    text: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    inputText: string;
    tokenSource: 'api' | 'estimated';
    creditsConsumed: number;
  }): Promise<string | null> => {
    return recordAiUsage({
      inputText: result.inputText,
      outputText: result.text,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      category,
      operation,
      userId,
      relatedId: opts.relatedId ?? ctx.relatedId,
      model: result.model,
      promptVersion: opts.promptVersion,
      tokenSource: result.tokenSource,
      feature,
      creditsConsumed: result.creditsConsumed,
    });
  };

  if (!userId || opts.skipBilling) {
    const result = await invokeAnthropic(opts);
    const rule = await getCreditsRepo().getActiveRule();
    const creditsConsumed = calculateCreditsFromTokens(
      result.inputTokens,
      result.outputTokens,
      rule
    );
    if (userId) {
      await persistUsage({ ...result, creditsConsumed });
    }
    return {
      text: result.text,
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      creditsConsumed: userId ? creditsConsumed : undefined,
    };
  }

  let reservationId = '';
  const billed = await withCreditBilling({
    userId,
    inputText,
    maxOutputTokens: maxTokens,
    feature,
    fn: async () => {
      const result = await invokeAnthropic(opts);
      const rule = await getCreditsRepo().getActiveRule();
      const creditsConsumed = calculateCreditsFromTokens(
        result.inputTokens,
        result.outputTokens,
        rule
      );
      const aiUsageId = await persistUsage({ ...result, creditsConsumed });
      return {
        text: result.text,
        model: result.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        creditsConsumed,
        aiUsageId,
      };
    },
  });

  return {
    text: billed.text,
    model: billed.model,
    inputTokens: billed.inputTokens,
    outputTokens: billed.outputTokens,
    creditsConsumed: billed.creditsConsumed,
  };
}

export function getAnthropicClient(): Anthropic {
  return claude;
}
