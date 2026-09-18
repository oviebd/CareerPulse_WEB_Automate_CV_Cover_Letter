import { describe, expect, it } from 'vitest';
import { calculateCreditsFromTokens } from '@/lib/credits/calculator';
import {
  MissingAnthropicUsageError,
  requireAnthropicUsageTokens,
} from '@/lib/ai/anthropic-usage';
import { estimateReservationCredits } from '@/lib/credits/reservation';

const defaultRule = {
  input_token_unit: 1000,
  input_token_credits: 1,
  output_token_unit: 1000,
  output_token_credits: 5,
};

describe('requireAnthropicUsageTokens', () => {
  it('returns API tokens when usage is present', () => {
    const out = requireAnthropicUsageTokens({
      input_tokens: 1500,
      output_tokens: 320,
      cache_read_input_tokens: 100,
    });
    expect(out.tokenSource).toBe('api');
    expect(out.inputTokens).toBe(1500);
    expect(out.outputTokens).toBe(320);
    expect(out.cacheReadInputTokens).toBe(100);
  });

  it('throws when usage is missing', () => {
    expect(() => requireAnthropicUsageTokens(undefined)).toThrow(MissingAnthropicUsageError);
    expect(() => requireAnthropicUsageTokens({ input_tokens: 10 })).toThrow(
      MissingAnthropicUsageError
    );
  });

  it('maps API tokens to credits via default rule', () => {
    const { inputTokens, outputTokens } = requireAnthropicUsageTokens({
      input_tokens: 1000,
      output_tokens: 200,
    });
    const credits = calculateCreditsFromTokens(inputTokens, outputTokens, defaultRule);
    expect(credits).toBe(2);
  });
});

describe('estimateReservationCredits', () => {
  it('reserves for full max output tokens', () => {
    const inputText = 'x'.repeat(5000);
    const credits = estimateReservationCredits(inputText, 8192, defaultRule, 5);
    expect(credits).toBe(1 + (8192 / 1000) * 5);
  });

  it('reservation covers actual API charge when output is below max', () => {
    const inputText = 'x'.repeat(5000);
    const reserved = estimateReservationCredits(inputText, 8192, defaultRule, 5);
    const actual = calculateCreditsFromTokens(1200, 2500, defaultRule);
    expect(reserved).toBeGreaterThanOrEqual(actual);
  });
});
