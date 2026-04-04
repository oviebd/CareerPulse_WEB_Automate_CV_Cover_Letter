import { computeCompletionPercentage } from '@/lib/cv-completion';
import type { CVProfile } from '@/types';

const FORBIDDEN_PATCH_KEYS = new Set([
  'id',
  'user_id',
  'created_at',
  'updated_at',
]);

/** Maps client/legacy keys to `cvs` column names */
export function normalizeCvPatchBody(body: Record<string, unknown>): Record<string, unknown> {
  const patch = { ...body };
  if ('preferred_cv_template_id' in patch && patch.preferred_template_id === undefined) {
    patch.preferred_template_id = patch.preferred_cv_template_id;
    delete patch.preferred_cv_template_id;
  }
  for (const k of FORBIDDEN_PATCH_KEYS) {
    delete patch[k];
  }
  if (Array.isArray(patch.referrals)) {
    patch.referrals = patch.referrals.slice(0, 2);
  }
  if (patch.section_visibility != null && typeof patch.section_visibility !== 'object') {
    delete patch.section_visibility;
  }
  return patch;
}

export function mergeAndCompleteCv(
  current: Record<string, unknown>,
  patch: Record<string, unknown>
): Record<string, unknown> {
  const merged = { ...current, ...patch } as Parameters<typeof computeCompletionPercentage>[0];
  const { percentage, isComplete } = computeCompletionPercentage(merged);
  return {
    ...patch,
    completion_percentage: percentage,
    is_complete: isComplete,
  };
}

/** Serialize CVProfile fields for DB insert/update (drops UI-only legacy keys when needed) */
export function editorPayloadToDbFields(
  payload: Partial<CVProfile> & Record<string, unknown>
): Record<string, unknown> {
  const {
    portfolio_url: _p,
    website_url: _w,
    ...rest
  } = payload;
  return rest as Record<string, unknown>;
}
