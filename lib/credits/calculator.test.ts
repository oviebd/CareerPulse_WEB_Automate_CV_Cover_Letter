import { describe, expect, it } from 'vitest';
import {
  calculateCreditsFromTokens,
  estimateCreditsFromPrompt,
} from '@/lib/credits/calculator';

const rule = {
  input_token_unit: 1000,
  input_token_credits: 1,
  output_token_unit: 1000,
  output_token_credits: 5,
};

describe('calculateCreditsFromTokens', () => {
  it('charges input tokens only', () => {
    expect(calculateCreditsFromTokens(1500, 0, rule)).toBe(2);
  });

  it('charges output tokens only', () => {
    expect(calculateCreditsFromTokens(0, 2500, rule)).toBe(15);
  });

  it('combines input and output with ceil rounding', () => {
    expect(calculateCreditsFromTokens(500, 500, rule)).toBe(6);
  });

  it('returns zero for zero tokens', () => {
    expect(calculateCreditsFromTokens(0, 0, rule)).toBe(0);
  });

  it('handles large token counts', () => {
    expect(calculateCreditsFromTokens(50_000, 10_000, rule)).toBe(100);
  });
});

describe('estimateCreditsFromPrompt', () => {
  it('estimates from prompt length and max output', () => {
    const credits = estimateCreditsFromPrompt('x'.repeat(5000), 1000, rule, 5);
    expect(credits).toBeGreaterThan(0);
  });
});
