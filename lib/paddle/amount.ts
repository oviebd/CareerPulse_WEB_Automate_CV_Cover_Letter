const ZERO_DECIMAL = new Set(['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF']);

export function paddleMinorToDecimal(amount: string | null | undefined, currency: string | null | undefined): number | null {
  if (amount == null || amount === '') return null;
  const n = Number(amount);
  if (!Number.isFinite(n) || n < 0) return null;
  const code = (currency ?? 'USD').toUpperCase();
  const major = ZERO_DECIMAL.has(code) ? n : n / 100;
  return Math.round(major * 100) / 100;
}
