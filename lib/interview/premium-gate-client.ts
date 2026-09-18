import { ApiError } from '@/lib/api-fetch';

export function isInterviewPremiumRequiredError(e: unknown): boolean {
  if (!(e instanceof ApiError)) return false;
  return e.code === 'UPGRADE_REQUIRED' || e.code === 'PRO_REQUIRED' || e.status === 403;
}
