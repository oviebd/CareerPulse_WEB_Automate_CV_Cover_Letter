import {
  calculateCreditsFromTokens,
  type CreditRuleInput,
} from '@/lib/credits/calculator';
import { getCharsPerToken } from '@/lib/ai/token-estimate';

/**
 * Pre-call credit hold: worst-case assuming full max_output_tokens.
 * Input is still estimated from prompt length (chars ÷ charsPerToken) until Count Tokens API is used.
 */
export function estimateReservationCredits(
  inputText: string,
  maxOutputTokens: number,
  rule: CreditRuleInput,
  charsPerToken = getCharsPerToken()
): number {
  const inputTokens = Math.ceil(Math.max(0, inputText.length) / Math.max(1, charsPerToken));
  const outputTokens = Math.max(0, Math.floor(maxOutputTokens));
  return calculateCreditsFromTokens(inputTokens, outputTokens, rule);
}
