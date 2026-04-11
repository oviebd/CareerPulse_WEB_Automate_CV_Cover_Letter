import type { CVData } from '@/src/types/cv.types';
import type { CVSectionVisibility, CVSectionVisibilityKey } from '@/types';

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
  'publications',
  'research',
  'volunteer',
  'interests',
  'custom',
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
  let out: CVData = { ...data, personal: { ...data.personal } };
  for (const key of ALL_KEYS) {
    if (!isCvSectionVisible(key, visibility)) {
      switch (key) {
        case 'photo':
          out = { ...out, personal: { ...out.personal, photo: undefined } };
          break;
        case 'address':
          out = { ...out, postalAddress: undefined };
          break;
        case 'summary':
          out = { ...out, summary: '' };
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
          out = { ...out, references: [] };
          break;
        case 'publications':
          out = { ...out, publications: [] };
          break;
        case 'research':
          out = { ...out, research: [] };
          break;
        case 'volunteer':
          out = { ...out, volunteer: [] };
          break;
        case 'interests':
          out = { ...out, interests: [] };
          break;
        case 'custom':
          out = { ...out, custom: [] };
          break;
        default:
          break;
      }
    }
  }
  return out;
}
