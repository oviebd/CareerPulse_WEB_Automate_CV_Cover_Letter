import { assertFeatureAccess, FeatureDisabledError, featureDisabledMessage } from '@/lib/access/user-permissions';
import type { FeatureKey } from '@/lib/access/feature-flags';

export type FeatureGuardResult =
  | { ok: true }
  | { ok: false; error: string; code: string; status: number };

export async function guardFeatureAccess(
  userId: string,
  feature: FeatureKey
): Promise<FeatureGuardResult> {
  try {
    await assertFeatureAccess(userId, feature);
    return { ok: true };
  } catch (err) {
    if (err instanceof FeatureDisabledError) {
      return {
        ok: false,
        error: featureDisabledMessage(feature),
        code: 'FEATURE_DISABLED',
        status: 403,
      };
    }
    return { ok: false, error: 'Unauthorized', code: 'UNAUTHORIZED', status: 401 };
  }
}
