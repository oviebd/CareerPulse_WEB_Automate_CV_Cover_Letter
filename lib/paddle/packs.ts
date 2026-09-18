import { getPaddleServerConfig } from '@/lib/config/paddle';
import { BillingError } from '@/lib/paddle/errors';

export type CreditPackKey = 'credits5' | 'credits10';

export type CreditPackDef = {
  key: CreditPackKey;
  label: string;
  priceUsd: number;
  credits: number;
};

export const CREDIT_PACKS: Record<CreditPackKey, CreditPackDef> = {
  credits5: {
    key: 'credits5',
    label: '300 AI credits',
    priceUsd: 5,
    credits: 300,
  },
  credits10: {
    key: 'credits10',
    label: '650 AI credits',
    priceUsd: 10,
    credits: 650,
  },
};

const PACK_ENV_KEYS: Record<CreditPackKey, keyof ReturnType<typeof getPaddleServerConfig>['priceIds']> = {
  credits5: 'pack_credits5',
  credits10: 'pack_credits10',
};

export function isCreditPackKey(value: string): value is CreditPackKey {
  return value === 'credits5' || value === 'credits10';
}

export function resolvePackPriceId(pack: string): { packKey: CreditPackKey; priceId: string } {
  if (!isCreditPackKey(pack)) {
    throw new BillingError('invalid_plan', 'That pack is not available.');
  }
  const priceId = getPaddleServerConfig().priceIds[PACK_ENV_KEYS[pack]];
  if (!priceId) {
    throw new BillingError('not_configured', 'Billing is not configured yet.', 503);
  }
  return { packKey: pack, priceId };
}

export function packKeyFromPriceId(priceId: string | null | undefined): CreditPackKey | null {
  if (!priceId) return null;
  const { priceIds } = getPaddleServerConfig();
  if (priceId === priceIds.pack_credits5) return 'credits5';
  if (priceId === priceIds.pack_credits10) return 'credits10';
  return null;
}
