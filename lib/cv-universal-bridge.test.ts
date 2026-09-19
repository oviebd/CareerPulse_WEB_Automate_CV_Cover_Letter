import { describe, expect, it } from 'vitest';
import { createEmptyCVData } from '@/src/utils/cvDefaults';
import { migrateLegacyCVData } from '@/src/utils/cvDefaults';
import { profileToUniversalCV, universalToProfilePayload } from '@/lib/cv-universal-bridge';
import { generateId } from '@/lib/utils';
import type { CVProfile } from '@/types';

describe('universalToProfilePayload extra links', () => {
  it('persists in-progress empty link rows to DB links JSON', () => {
    const cv = createEmptyCVData();
    const draftId = generateId();
    cv.personal.links.other = [{ id: draftId, label: '', url: '' }];

    const payload = universalToProfilePayload(cv);
    const links = payload.links as { id: string; label: string; url: string }[];
    expect(links).toHaveLength(1);
    expect(links[0].id).toBe(draftId);
    expect(links[0].url).toBe('');

    const roundTripped = migrateLegacyCVData(payload);
    expect(roundTripped.personal.links.other).toEqual([
      { id: draftId, label: '', url: '' },
    ]);
  });

  it('round-trips through profileToUniversalCV after PATCH-shaped payload', () => {
    const cv = createEmptyCVData();
    const draftId = generateId();
    cv.personal.links.other = [{ id: draftId, label: 'Twitter', url: '' }];

    const payload = universalToProfilePayload(cv);
    const profile = {
      id: 'cv-1',
      user_id: 'u-1',
      name: 'Test',
      preferred_template_id: 'classic',
      accent_color: '#2563EB',
      font_family: 'Inter',
      full_name: null,
      professional_title: null,
      email: null,
      phone: null,
      location: null,
      linkedin_url: null,
      github_url: null,
      links: payload.links,
      summary: null,
      experience: [],
      education: [],
      skills: [],
      projects: [],
      certifications: [],
      languages: [],
      awards: [],
      is_complete: false,
      completion_percentage: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as unknown as CVProfile;

    const restored = profileToUniversalCV(profile);
    expect(restored.personal.links.other).toEqual([
      { id: draftId, label: 'Twitter', url: '' },
    ]);
  });
});
