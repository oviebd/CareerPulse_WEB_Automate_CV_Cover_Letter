import { estimateTokensFromText, getCharsPerToken } from '@/lib/ai/token-estimate';

export type AnthropicUsagePayload = {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
};

export class MissingAnthropicUsageError extends Error {
  constructor() {
    super('missing_api_usage');
    this.name = 'MissingAnthropicUsageError';
  }
}

/** Billing requires API usage; char estimate is not used for successful responses. */
export function requireAnthropicUsageTokens(usage: AnthropicUsagePayload | undefined): {
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
  tokenSource: 'api';
} {
  const input = usage?.input_tokens;
  const output = usage?.output_tokens;
  if (input == null || output == null || !Number.isFinite(input) || !Number.isFinite(output)) {
    throw new MissingAnthropicUsageError();
  }
  return {
    inputTokens: Math.max(0, Math.floor(input)),
    outputTokens: Math.max(0, Math.floor(output)),
    cacheCreationInputTokens: Math.max(0, Math.floor(usage?.cache_creation_input_tokens ?? 0)),
    cacheReadInputTokens: Math.max(0, Math.floor(usage?.cache_read_input_tokens ?? 0)),
    tokenSource: 'api',
  };
}

/** Non-billing paths only (e.g. diagnostics). */
export function estimateUsageFromText(inputText: string, outputText: string): {
  inputTokens: number;
  outputTokens: number;
  tokenSource: 'estimated';
} {
  const charsPerToken = getCharsPerToken();
  return {
    inputTokens: estimateTokensFromText(inputText, charsPerToken),
    outputTokens: estimateTokensFromText(outputText, charsPerToken),
    tokenSource: 'estimated',
  };
}
