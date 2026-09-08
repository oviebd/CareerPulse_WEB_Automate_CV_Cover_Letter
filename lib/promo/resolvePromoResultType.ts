export type PromoResultType = 'premium' | 'credits' | 'both';

export function resolvePromoResultType(
  grantsPlan: string | null | undefined,
  bonusCredits: number
): PromoResultType {
  const grantsPremium = Boolean(grantsPlan);
  const grantsCredits = bonusCredits > 0;

  if (grantsPremium && grantsCredits) return 'both';
  if (grantsPremium) return 'premium';
  return 'credits';
}
