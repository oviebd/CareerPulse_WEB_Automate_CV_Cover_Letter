import { describe, expect, it } from 'vitest';
import { computeAnthropicUsdCost } from '@/lib/ai/anthropic-pricing';

describe('computeAnthropicUsdCost', () => {
  it('computes Haiku cost for 1k input + 200 output', () => {
    const { usd } = computeAnthropicUsdCost({
      model: 'claude-haiku-4-5-20251001',
      inputTokens: 1000,
      outputTokens: 200,
    });
    expect(usd).toBe(0.002);
  });
});
