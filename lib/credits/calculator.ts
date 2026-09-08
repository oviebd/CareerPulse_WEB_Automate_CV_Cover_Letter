import type { CreditRuleSnapshot } from '@/types';

const CREDIT_SCALE = 4;
const CREDIT_FACTOR = 10 ** CREDIT_SCALE;

export type CreditRuleInput = {
  input_token_unit: number;
  input_token_credits: number;
  output_token_unit: number;
  output_token_credits: number;
  rule_version_id?: string;
};

export function roundCredits(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * CREDIT_FACTOR) / CREDIT_FACTOR;
}

export function formatCredits(value: number): string {
  return roundCredits(value).toLocaleString(undefined, {
    maximumFractionDigits: CREDIT_SCALE,
    minimumFractionDigits: 0,
  });
}

export function toRuleSnapshot(rule: CreditRuleInput): CreditRuleSnapshot {
  return {
    input_token_unit: rule.input_token_unit,
    input_token_credits: rule.input_token_credits,
    output_token_unit: rule.output_token_unit,
    output_token_credits: rule.output_token_credits,
    rule_version_id: rule.rule_version_id,
  };
}

export function calculateCreditsFromTokens(
  inputTokens: number,
  outputTokens: number,
  rule: CreditRuleInput
): number {
  const input = Math.max(0, inputTokens);
  const output = Math.max(0, outputTokens);
  if (input === 0 && output === 0) return 0;

  const inputUnit = Math.max(1, rule.input_token_unit);
  const outputUnit = Math.max(1, rule.output_token_unit);

  const inputCredits = (input / inputUnit) * Math.max(0, rule.input_token_credits);
  const outputCredits = (output / outputUnit) * Math.max(0, rule.output_token_credits);

  return roundCredits(inputCredits + outputCredits);
}

export function estimateCreditsFromPrompt(
  inputText: string,
  maxOutputTokens: number,
  rule: CreditRuleInput,
  charsPerToken = 5
): number {
  const inputTokens = Math.ceil(Math.max(0, inputText.length) / Math.max(1, charsPerToken));
  return calculateCreditsFromTokens(inputTokens, maxOutputTokens, rule);
}
