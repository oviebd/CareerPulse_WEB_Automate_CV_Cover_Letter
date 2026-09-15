import { describe, expect, it } from 'vitest';
import { effectiveAccessTier, hasPremiumAccess } from '@/lib/access/premium';
import { Feature, canAccessFeatureSync } from '@/lib/access/feature-flags';
import type { Profile } from '@/types';

const base: Profile = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'a@test.com',
  full_name: 'Test',
  avatar_url: null,
  subscription_tier: 'pro',
  subscription_status: 'active',
  subscription_expires_at: null,
  trial_ends_at: null,
  is_onboarded: true,
  created_at: '',
  updated_at: '',
};

describe('hasPremiumAccess', () => {
  it('allows active and trialing and past_due', () => {
    expect(hasPremiumAccess({ ...base, subscription_status: 'active' })).toBe(true);
    expect(hasPremiumAccess({ ...base, subscription_status: 'trialing' })).toBe(true);
    expect(hasPremiumAccess({ ...base, subscription_status: 'past_due' })).toBe(true);
  });

  it('allows promo/admin grants with null expiry', () => {
    expect(hasPremiumAccess({ ...base, subscription_status: 'active', subscription_expires_at: null })).toBe(true);
  });

  it('keeps access for cancel-at-period-end until the date', () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    expect(
      hasPremiumAccess({ ...base, subscription_status: 'cancelled', subscription_expires_at: future })
    ).toBe(true);
  });

  it('denies paused, inactive, expired cancelled, and free', () => {
    expect(hasPremiumAccess({ ...base, subscription_status: 'paused' })).toBe(false);
    expect(hasPremiumAccess({ ...base, subscription_status: 'inactive' })).toBe(false);
    expect(
      hasPremiumAccess({
        ...base,
        subscription_status: 'cancelled',
        subscription_expires_at: '2000-01-01T00:00:00Z',
      })
    ).toBe(false);
    expect(hasPremiumAccess({ ...base, subscription_tier: 'free', subscription_status: 'active' })).toBe(false);
  });

  it('gates DOCX on premium access not raw tier', () => {
    expect(canAccessFeatureSync({ ...base, subscription_status: 'paused' }, Feature.DOCX_EXPORT)).toBe(false);
    expect(canAccessFeatureSync(base, Feature.DOCX_EXPORT)).toBe(true);
    expect(effectiveAccessTier({ ...base, subscription_status: 'paused' })).toBe('free');
  });
});
