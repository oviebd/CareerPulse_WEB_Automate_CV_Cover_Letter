import { describe, expect, it } from 'vitest';
import { DEFAULT_EDITOR_STATE } from '@/lib/cv-editor-state';
import { resolvePostSaveAck } from '@/lib/cv-editor-save-ack';
import type { CVProfile } from '@/types';

const snapshot = JSON.stringify(DEFAULT_EDITOR_STATE);

function minimalProfile(overrides: Partial<CVProfile> = {}): CVProfile {
  return {
    id: 'cv-1',
    user_id: 'u-1',
    name: 'Test CV',
    full_name: 'Changed On Server',
    preferred_template_id: 'classic',
    accent_color: '#2563EB',
    font_family: 'Inter',
    professional_title: null,
    email: null,
    phone: null,
    location: null,
    linkedin_url: null,
    github_url: null,
    links: [],
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
    ...overrides,
  } as CVProfile;
}

describe('resolvePostSaveAck', () => {
  it('uses snapshot_only when client still matches save snapshot', () => {
    const ack = resolvePostSaveAck(
      snapshot,
      snapshot,
      minimalProfile({ full_name: 'Server value' }),
      DEFAULT_EDITOR_STATE
    );
    expect(ack.kind).toBe('snapshot_only');
    if (ack.kind === 'snapshot_only') {
      expect(ack.savedSnapshot).toBe(snapshot);
    }
  });

  it('rehydrates when user edited during save', () => {
    const ack = resolvePostSaveAck(
      JSON.stringify({ ...DEFAULT_EDITOR_STATE, name: 'Edited locally' }),
      snapshot,
      minimalProfile(),
      DEFAULT_EDITOR_STATE
    );
    expect(ack.kind).toBe('rehydrate');
  });
});
