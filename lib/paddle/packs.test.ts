import { describe, expect, it } from 'vitest';
import { CREDIT_PACKS } from '@/lib/paddle/packs';

describe('credit packs catalog', () => {
  it('maps pack prices to credit amounts only', () => {
    expect(CREDIT_PACKS.credits5.priceUsd).toBe(5);
    expect(CREDIT_PACKS.credits5.credits).toBe(300);

    expect(CREDIT_PACKS.credits10.priceUsd).toBe(10);
    expect(CREDIT_PACKS.credits10.credits).toBe(650);
  });
});
