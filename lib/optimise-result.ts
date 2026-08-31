import type { CVData } from '@/types';
import { migrateLegacyCVData } from '@/src/utils/cvDefaults';
import {
  optimisedCvContentToProfilePayload,
  universalToProfilePayload,
} from '@/lib/cv-universal-bridge';
import { computeCompletionPercentage } from '@/lib/cv-completion';

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

/**
 * Normalise any optimise/editor JSON into DB column payload + completion fields.
 */
export function optimisedJsonToDbPayload(
  raw: string | Record<string, unknown>
): Record<string, unknown> {
  const obj =
    typeof raw === 'string'
      ? (JSON.parse(raw) as Record<string, unknown>)
      : raw;
  const profile = optimisedCvContentToProfilePayload(obj);
  const { percentage, isComplete } = computeCompletionPercentage({
    full_name: profile.full_name as string | null | undefined,
    professional_title: profile.professional_title as string | null | undefined,
    email: profile.email as string | null | undefined,
    phone: profile.phone as string | null | undefined,
    location: profile.location as string | null | undefined,
    summary: profile.summary as string | null | undefined,
    experience: profile.experience as Parameters<
      typeof computeCompletionPercentage
    >[0]['experience'],
    education: profile.education as Parameters<
      typeof computeCompletionPercentage
    >[0]['education'],
    skills: profile.skills as Parameters<
      typeof computeCompletionPercentage
    >[0]['skills'],
    projects: profile.projects as Parameters<
      typeof computeCompletionPercentage
    >[0]['projects'],
    certifications: profile.certifications as Parameters<
      typeof computeCompletionPercentage
    >[0]['certifications'],
    languages: profile.languages as Parameters<
      typeof computeCompletionPercentage
    >[0]['languages'],
    awards: profile.awards as Parameters<
      typeof computeCompletionPercentage
    >[0]['awards'],
  });
  return {
    ...profile,
    completion_percentage: percentage,
    is_complete: isComplete,
  };
}
