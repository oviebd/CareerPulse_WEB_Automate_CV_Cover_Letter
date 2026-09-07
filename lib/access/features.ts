import { resolveUserRole } from '@/lib/auth/roles';
import {
  canAccessFeatureSync,
  Feature,
  resolveTier,
  type AccessUser,
  type FeatureKey,
} from '@/lib/access/feature-flags';
import { canUseTemplate as canUseTemplateTier } from '@/lib/subscription';

export { Feature, canAccessFeatureSync, resolveTier };
export type { AccessUser, FeatureKey };

export async function canAccessFeature(
  user: AccessUser | null | undefined,
  feature: FeatureKey,
  opts?: { templateTiers?: string[] }
): Promise<boolean> {
  if (!user?.id) return false;

  if (feature === Feature.ADMIN_CONSOLE) {
    const role = user.role ?? (await resolveUserRole(user.id));
    return role === 'super_admin';
  }

  if (feature === Feature.PREMIUM_CV_TEMPLATE || feature === Feature.PREMIUM_CL_TEMPLATE) {
    if (!opts?.templateTiers?.length) return false;
    return canUseTemplateTier(opts.templateTiers, resolveTier(user));
  }

  return canAccessFeatureSync(
    {
      id: user.id,
      email: '',
      full_name: null,
      avatar_url: null,
      role: user.role as 'user' | 'super_admin' | undefined,
      subscription_tier: resolveTier(user),
      subscription_status: 'inactive',
      subscription_expires_at: null,
      trial_ends_at: null,
      is_onboarded: true,
      can_use_ai: user.can_use_ai ?? true,
      can_create_documents: user.can_create_documents ?? true,
      can_use_interview_prep: user.can_use_interview_prep ?? true,
      created_at: '',
      updated_at: '',
    },
    feature,
    opts
  );
}
