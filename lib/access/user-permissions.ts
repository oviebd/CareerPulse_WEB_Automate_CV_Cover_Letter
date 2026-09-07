import { getProfilesRepo } from '@/lib/db/repositories/profiles';
import { getUsersRepo } from '@/lib/db/repositories/users';
import { Feature, type FeatureKey } from '@/lib/access/feature-flags';
import type { Profile } from '@/types';

export class AccountInactiveError extends Error {
  constructor() {
    super('ACCOUNT_INACTIVE');
    this.name = 'AccountInactiveError';
  }
}

export class FeatureDisabledError extends Error {
  constructor(public feature: FeatureKey) {
    super('FEATURE_DISABLED');
    this.name = 'FeatureDisabledError';
  }
}

const FEATURE_FLAG_MAP: Partial<Record<FeatureKey, keyof Profile>> = {
  [Feature.AI_GENERATION]: 'can_use_ai',
  [Feature.CV_BUILDER]: 'can_create_documents',
  [Feature.INTERVIEW_PREPARATION]: 'can_use_interview_prep',
};

export async function assertUserActive(userId: string): Promise<void> {
  const user = await getUsersRepo().findById(userId);
  if (!user || user.is_active === false) {
    throw new AccountInactiveError();
  }
}

export async function assertFeatureAccess(userId: string, feature: FeatureKey): Promise<Profile> {
  await assertUserActive(userId);
  const profile = await getProfilesRepo().getById(userId);
  if (!profile) throw new AccountInactiveError();

  const flagKey = FEATURE_FLAG_MAP[feature];
  if (flagKey && profile[flagKey] === false) {
    throw new FeatureDisabledError(feature);
  }

  return profile;
}

export function featureDisabledMessage(feature: FeatureKey): string {
  switch (feature) {
    case Feature.AI_GENERATION:
      return 'AI features are disabled for your account.';
    case Feature.CV_BUILDER:
      return 'CV and cover letter creation is disabled for your account.';
    case Feature.INTERVIEW_PREPARATION:
      return 'Interview preparation is disabled for your account.';
    default:
      return 'This feature is disabled for your account.';
  }
}
