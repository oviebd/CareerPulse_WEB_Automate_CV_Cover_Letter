/** USD per million tokens (Anthropic API list prices). Snapshot in usage metadata when recording. */

export type AnthropicPricingRates = {
  input_per_mtok: number;
  output_per_mtok: number;
  cache_write_per_mtok: number;
  cache_read_per_mtok: number;
};

const HAIKU_RATES: AnthropicPricingRates = {
  input_per_mtok: 1,
  output_per_mtok: 5,
  cache_write_per_mtok: 1.25,
  cache_read_per_mtok: 0.1,
};

const SONNET_RATES: AnthropicPricingRates = {
  input_per_mtok: 3,
  output_per_mtok: 15,
  cache_write_per_mtok: 3.75,
  cache_read_per_mtok: 0.3,
};

export function ratesForModel(model: string | null | undefined): AnthropicPricingRates {
  const m = (model ?? '').toLowerCase();
  if (m.includes('haiku')) return HAIKU_RATES;
  if (m.includes('sonnet') || m.includes('opus')) return SONNET_RATES;
  return HAIKU_RATES;
}

export function computeAnthropicUsdCost(opts: {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens?: number;
  cacheReadInputTokens?: number;
}): { usd: number; rates: AnthropicPricingRates } {
  const rates = ratesForModel(opts.model);
  const input = Math.max(0, opts.inputTokens);
  const output = Math.max(0, opts.outputTokens);
  const cacheWrite = Math.max(0, opts.cacheCreationInputTokens ?? 0);
  const cacheRead = Math.max(0, opts.cacheReadInputTokens ?? 0);

  const usd =
    (input / 1_000_000) * rates.input_per_mtok +
    (output / 1_000_000) * rates.output_per_mtok +
    (cacheWrite / 1_000_000) * rates.cache_write_per_mtok +
    (cacheRead / 1_000_000) * rates.cache_read_per_mtok;

  return { usd: Math.round(usd * 1_000_000) / 1_000_000, rates };
}
