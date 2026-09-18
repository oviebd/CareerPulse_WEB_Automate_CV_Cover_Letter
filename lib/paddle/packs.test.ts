import { describe, expect, it } from 'vitest';
import { CREDIT_PACKS, packKeyFromPriceId } from '@/lib/paddle/packs';

describe('credit packs catalog', () => {
  it('maps pack prices to credit amounts only', () => {
    expect(CREDIT_PACKS.credits5.priceUsd).toBe(5);
    expect(CREDIT_PACKS.credits5.credits).toBe(300);

    expect(CREDIT_PACKS.credits10.priceUsd).toBe(10);
    expect(CREDIT_PACKS.credits10.credits).toBe(650);
  });

  it('maps configured Paddle price ids back to pack keys', () => {
    process.env.NEXT_PUBLIC_PADDLE_PRICE_PACK_CREDITS5 = 'pri_pack_5';
    process.env.NEXT_PUBLIC_PADDLE_PRICE_PACK_CREDITS10 = 'pri_pack_10';
    expect(packKeyFromPriceId('pri_pack_5')).toBe('credits5');
    expect(packKeyFromPriceId('pri_pack_10')).toBe('credits10');
    expect(packKeyFromPriceId('pri_other')).toBeNull();
  });
});
