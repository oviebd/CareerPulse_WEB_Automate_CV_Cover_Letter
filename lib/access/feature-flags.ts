import { resolveEffectiveTier } from '@/lib/dev-subscription';
import { canUseTemplate as canUseTemplateTier } from '@/lib/subscription';
import type { Profile, SubscriptionTier } from '@/types';

export const Feature = {
  CV_BUILDER: 'CV_BUILDER',
  INTERVIEW_PREPARATION: 'INTERVIEW_PREPARATION',
  AI_GENERATION: 'AI_GENERATION',
  PREMIUM_CV_TEMPLATE: 'PREMIUM_CV_TEMPLATE',
  PREMIUM_CL_TEMPLATE: 'PREMIUM_CL_TEMPLATE',
  DOCX_EXPORT: 'DOCX_EXPORT',
  ATS_AUTO_FIX: 'ATS_AUTO_FIX',
  ADMIN_CONSOLE: 'ADMIN_CONSOLE',
} as const;

export type FeatureKey = (typeof Feature)[keyof typeof Feature];

export type AccessUser = {
  id: string;
  role?: string | null;
  subscription_tier?: string | null;
  can_use_ai?: boolean | null;
  can_create_documents?: boolean | null;
  can_use_interview_prep?: boolean | null;
};

export function resolveTier(user: AccessUser): SubscriptionTier {
  return resolveEffectiveTier(user.subscription_tier);
}

export function canAccessFeatureSync(
  profile: Profile | null | undefined,
  feature: FeatureKey,
  opts?: { templateTiers?: string[] }
): boolean {
  if (!profile?.id) return false;
  const tier = resolveTier(profile);

  switch (feature) {
    case Feature.CV_BUILDER:
      return profile.can_create_documents !== false;
    case Feature.INTERVIEW_PREPARATION:
      return profile.can_use_interview_prep !== false;
    case Feature.AI_GENERATION:
      return profile.can_use_ai !== false;
    case Feature.ADMIN_CONSOLE:
      return profile.role === 'super_admin';
    case Feature.PREMIUM_CV_TEMPLATE:
    case Feature.PREMIUM_CL_TEMPLATE:
      return opts?.templateTiers
        ? canUseTemplateTier(opts.templateTiers, tier)
        : false;
    case Feature.DOCX_EXPORT:
    case Feature.ATS_AUTO_FIX:
      return tier === 'pro';
    default:
      return false;
  }
}
