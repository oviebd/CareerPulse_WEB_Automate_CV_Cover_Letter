import type { CVData, CVSectionVisibility } from '@/types';

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

/** Normalise optimise JSON into `CVData` for the job-specific editor (draft mode). */
export function optimisedCvJsonToCvData(raw: Record<string, unknown>): CVData {
  const links = Array.isArray(raw.links) ? (raw.links as CVData['links']) : [];
  const section =
    raw.section_visibility &&
    typeof raw.section_visibility === 'object' &&
    !Array.isArray(raw.section_visibility)
      ? (raw.section_visibility as CVSectionVisibility)
      : {};
  return {
    full_name: typeof raw.full_name === 'string' ? raw.full_name : null,
    professional_title:
      typeof raw.professional_title === 'string' ? raw.professional_title : null,
    email: typeof raw.email === 'string' ? raw.email : null,
    phone: typeof raw.phone === 'string' ? raw.phone : null,
    location: typeof raw.location === 'string' ? raw.location : null,
    linkedin_url: typeof raw.linkedin_url === 'string' ? raw.linkedin_url : null,
    github_url: typeof raw.github_url === 'string' ? raw.github_url : null,
    links,
    address: typeof raw.address === 'string' ? raw.address : null,
    photo_url: typeof raw.photo_url === 'string' ? raw.photo_url : null,
    summary: typeof raw.summary === 'string' ? raw.summary : null,
    section_visibility: section,
    experience: Array.isArray(raw.experience)
      ? (raw.experience as CVData['experience'])
      : [],
    education: Array.isArray(raw.education)
      ? (raw.education as CVData['education'])
      : [],
    skills: Array.isArray(raw.skills) ? (raw.skills as CVData['skills']) : [],
    projects: Array.isArray(raw.projects)
      ? (raw.projects as CVData['projects'])
      : [],
    certifications: Array.isArray(raw.certifications)
      ? (raw.certifications as CVData['certifications'])
      : [],
    languages: Array.isArray(raw.languages)
      ? (raw.languages as CVData['languages'])
      : [],
    awards: Array.isArray(raw.awards) ? (raw.awards as CVData['awards']) : [],
    referrals: Array.isArray(raw.referrals)
      ? (raw.referrals as CVData['referrals'])
      : [],
  };
}
