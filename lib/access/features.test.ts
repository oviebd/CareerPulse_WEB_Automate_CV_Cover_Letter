import { describe, expect, it } from 'vitest';
import { canAccessFeatureSync, Feature } from '@/lib/access/feature-flags';
import type { Profile } from '@/types';

const baseProfile: Profile = {
  id: '1',
  email: 'a@test.com',
  full_name: 'Test',
  avatar_url: null,
  subscription_tier: 'free',
  subscription_status: 'inactive',
  subscription_expires_at: null,
  trial_ends_at: null,
  is_onboarded: true,
  created_at: '',
  updated_at: '',
};

describe('canAccessFeatureSync', () => {
  it('allows CV builder for free users', () => {
    expect(canAccessFeatureSync(baseProfile, Feature.CV_BUILDER)).toBe(true);
  });

  it('allows interview prep for free users', () => {
    expect(canAccessFeatureSync(baseProfile, Feature.INTERVIEW_PREPARATION)).toBe(true);
  });

  it('blocks premium template for free users', () => {
    expect(
      canAccessFeatureSync(baseProfile, Feature.PREMIUM_CV_TEMPLATE, {
        templateTiers: ['pro'],
      })
    ).toBe(false);
  });

  it('allows premium template for pro users', () => {
    expect(
      canAccessFeatureSync(
        { ...baseProfile, subscription_tier: 'pro' },
        Feature.PREMIUM_CV_TEMPLATE,
        { templateTiers: ['pro'] }
      )
    ).toBe(true);
  });

  it('allows admin console only for super admin', () => {
    expect(canAccessFeatureSync(baseProfile, Feature.ADMIN_CONSOLE)).toBe(false);
    expect(
      canAccessFeatureSync(
        { ...baseProfile, role: 'super_admin' },
        Feature.ADMIN_CONSOLE
      )
    ).toBe(true);
  });

  it('blocks AI when can_use_ai is false', () => {
    expect(
      canAccessFeatureSync({ ...baseProfile, can_use_ai: false }, Feature.AI_GENERATION)
    ).toBe(false);
  });

  it('blocks CV builder when can_create_documents is false', () => {
    expect(
      canAccessFeatureSync({ ...baseProfile, can_create_documents: false }, Feature.CV_BUILDER)
    ).toBe(false);
  });

  it('blocks interview prep when can_use_interview_prep is false', () => {
    expect(
      canAccessFeatureSync(
        { ...baseProfile, can_use_interview_prep: false },
        Feature.INTERVIEW_PREPARATION
      )
    ).toBe(false);
  });
});
