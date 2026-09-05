/** Configurable chars-per-token divisor (default 5). Tune via AI_CHARS_PER_TOKEN env. */

export function getCharsPerToken(): number {
  const raw = process.env.AI_CHARS_PER_TOKEN?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : 5;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
}

export function estimateTokens(charCount: number, charsPerToken?: number): number {
  const divisor = charsPerToken ?? getCharsPerToken();
  if (charCount <= 0) return 0;
  return Math.ceil(charCount / divisor);
}

export function estimateTokensFromText(text: string, charsPerToken?: number): number {
  return estimateTokens(text.length, charsPerToken);
}
