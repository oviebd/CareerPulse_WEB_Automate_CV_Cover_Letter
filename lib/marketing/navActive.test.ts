import { describe, expect, it } from 'vitest';
import { isBuildCvNavActive, isMarketingNavActive } from '@/lib/marketing/navActive';

describe('isMarketingNavActive', () => {
  it('highlights pricing on the pricing page, not other tabs', () => {
    expect(isMarketingNavActive('/pricing', '', '/pricing')).toBe(true);
    expect(isMarketingNavActive('/pricing', '', '/#features')).toBe(false);
    expect(isMarketingNavActive('/pricing', '', '/#interview')).toBe(false);
    expect(isMarketingNavActive('/pricing', '', '/#templates')).toBe(false);
    expect(isBuildCvNavActive('/pricing')).toBe(false);
  });

  it('highlights hash sections only on the landing page', () => {
    expect(isMarketingNavActive('/', '#features', '/#features')).toBe(true);
    expect(isMarketingNavActive('/', 'features', '/#features')).toBe(true);
    expect(isMarketingNavActive('/', '#interview', '/#features')).toBe(false);
    expect(isMarketingNavActive('/pricing', '#features', '/#features')).toBe(false);
  });

  it('does not highlight landing sections when there is no hash', () => {
    expect(isMarketingNavActive('/', '', '/#features')).toBe(false);
    expect(isMarketingNavActive('/', '', '/#interview')).toBe(false);
    expect(isMarketingNavActive('/', '', '/#templates')).toBe(false);
  });

  it('highlights Build CV only on the builder route', () => {
    expect(isBuildCvNavActive('/cv/builder')).toBe(true);
    expect(isBuildCvNavActive('/cv/builder/edit')).toBe(true);
    expect(isBuildCvNavActive('/cv')).toBe(false);
    expect(isBuildCvNavActive('/')).toBe(false);
  });
});
