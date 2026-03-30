import type { CVData, CVSectionVisibility, CVSectionVisibilityKey } from '@/types';

const ALL_KEYS: CVSectionVisibilityKey[] = [
  'photo',
  'address',
  'summary',
  'experience',
  'education',
  'skills',
  'projects',
  'languages',
  'certifications',
  'awards',
  'referrals',
];

export function isCvSectionVisible(
  key: CVSectionVisibilityKey,
  visibility: CVSectionVisibility | null | undefined
): boolean {
  if (visibility == null) return true;
  const v = visibility[key];
  if (v === false) return false;
  return true;
}

/** Strip hidden sections from CV data for PDF/HTML templates. */
export function applyCvSectionVisibility(
  data: CVData,
  visibility: CVSectionVisibility | null | undefined
): CVData {
  if (visibility == null || Object.keys(visibility).length === 0) {
    return data;
  }
  let out: CVData = { ...data };
  for (const key of ALL_KEYS) {
    if (!isCvSectionVisible(key, visibility)) {
      switch (key) {
        case 'photo':
          out = { ...out, photo_url: null };
          break;
        case 'address':
          out = { ...out, address: null };
          break;
        case 'summary':
          out = { ...out, summary: null };
          break;
        case 'experience':
          out = { ...out, experience: [] };
          break;
        case 'education':
          out = { ...out, education: [] };
          break;
        case 'skills':
          out = { ...out, skills: [] };
          break;
        case 'projects':
          out = { ...out, projects: [] };
          break;
        case 'languages':
          out = { ...out, languages: [] };
          break;
        case 'certifications':
          out = { ...out, certifications: [] };
          break;
        case 'awards':
          out = { ...out, awards: [] };
          break;
        case 'referrals':
          out = { ...out, referrals: [] };
          break;
        default:
          break;
      }
    }
  }
  return out;
}
