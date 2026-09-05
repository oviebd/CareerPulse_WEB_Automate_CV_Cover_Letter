import { getCharsPerToken, estimateTokensFromText } from '@/lib/ai/token-estimate';
import { getAiUsageContext, type AiUsageCategory } from '@/lib/ai/usage-context';
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
};

export async function recordAiUsage(input: RecordAiUsageInput): Promise<void> {
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
      return;
    }

    const charsPerToken = getCharsPerToken();
    const inputChars = input.inputText.length;
    const outputChars = input.outputText.length;

    await getAiUsageRepo().insertEvent({
      user_id: userId,
      category,
      operation,
      input_chars: inputChars,
      output_chars: outputChars,
      input_tokens: input.inputTokens ?? estimateTokensFromText(input.inputText, charsPerToken),
      output_tokens: input.outputTokens ?? estimateTokensFromText(input.outputText, charsPerToken),
      chars_per_token: charsPerToken,
      model: input.model ?? null,
      prompt_version: input.promptVersion ?? null,
      related_id: input.relatedId ?? ctx.relatedId ?? null,
    });
  } catch (e) {
    console.error('recordAiUsage failed', e);
  }
}
