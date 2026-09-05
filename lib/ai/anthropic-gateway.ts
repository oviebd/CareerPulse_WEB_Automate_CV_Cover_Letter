import Anthropic from '@anthropic-ai/sdk';
import { recordAiUsage } from '@/lib/ai/record-usage';
import { estimateTokensFromText } from '@/lib/ai/token-estimate';
import type { AiUsageCategory } from '@/lib/ai/usage-context';

export const CLAUDE_MODEL =
  process.env.ANTHROPIC_MODEL?.trim() || 'claude-sonnet-4-20250514';

export const INTERVIEW_ANALYZER_MODEL =
  process.env.CV_ANALYZER_API_MODEL?.trim() || 'claude-haiku-4-5-20251001';

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
};

export type ClaudeCompleteResult = {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
};

/** Single entry point for non-streaming Anthropic calls — records token usage before returning. */
export async function claudeComplete(
  opts: ClaudeCompleteOptions
): Promise<ClaudeCompleteResult> {
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
  const inputTokens = message.usage?.input_tokens ?? estimateTokensFromText(inputText);
  const outputTokens = message.usage?.output_tokens ?? estimateTokensFromText(text);

  await recordAiUsage({
    inputText,
    outputText: text,
    inputTokens,
    outputTokens,
    category: opts.category,
    operation: opts.operation,
    userId: opts.userId,
    relatedId: opts.relatedId,
    model,
    promptVersion: opts.promptVersion,
  });

  return { text, model, inputTokens, outputTokens };
}

export function getAnthropicClient(): Anthropic {
  return claude;
}
