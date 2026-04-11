import type { CVProfile } from '@/types';
import type { CVData } from '@/types';
import { profileToUniversalCV } from '@/lib/cv-universal-bridge';

export function cvProfileToCvData(p: CVProfile): CVData {
  return profileToUniversalCV(p);
}
