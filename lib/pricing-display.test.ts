import { describe, expect, it } from 'vitest';
import { PRICING } from '@/types';

describe('PRICING display amounts', () => {
  it('uses 7.99 / 79.99 for Pro SKUs', () => {
    expect(PRICING.pro_monthly.amount).toBe(7.99);
    expect(PRICING.pro_yearly.amount).toBe(79.99);
  });
});
