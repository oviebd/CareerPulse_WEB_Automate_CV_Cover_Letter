import type { CVData } from '@/types';
import { migrateLegacyCVData } from '@/src/utils/cvDefaults';
import { universalToProfilePayload } from '@/lib/cv-universal-bridge';

/**
 * Optimised CV from `/api/cv/optimise` is `JSON.stringify(optimised_cv)`.
 */
export function parseOptimisedCvText(raw: string | undefined): {
  ok: true;
  object: Record<string, unknown>;
} | { ok: false; message: string } {
  if (!raw?.trim()) {
    return { ok: false, message: 'No CV content to display.' };
  }
  try {
    const object = JSON.parse(raw) as unknown;
    if (!object || typeof object !== 'object' || Array.isArray(object)) {
      return { ok: false, message: 'CV data was not valid JSON.' };
    }
    return { ok: true, object: object as Record<string, unknown> };
  } catch {
    return { ok: false, message: 'CV data could not be parsed as JSON.' };
  }
}

/** Serialise editor `CVData` to the flat JSON shape used by optimise flows. */
export function cvDataToOptimisedCvJson(data: CVData): string {
  return JSON.stringify(universalToProfilePayload(data));
}

export function optimisedCvJsonToCvData(raw: Record<string, unknown>): CVData {
  return migrateLegacyCVData(raw);
}
