import { resolveUserRole } from '@/lib/auth/roles';
import {
  canAccessFeatureSync,
  Feature,
  resolveTier,
  type AccessUser,
  type FeatureKey,
} from '@/lib/access/feature-flags';
import { getProfilesRepo } from '@/lib/db/repositories/profiles';

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

  const profile = await getProfilesRepo().getById(user.id);
  if (!profile) return false;
  return canAccessFeatureSync(
    { ...profile, role: user.role as 'user' | 'super_admin' | undefined },
    feature,
    opts
  );
}
