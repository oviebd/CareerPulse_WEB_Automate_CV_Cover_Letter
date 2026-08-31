import { DEFAULT_CV_ACCENT } from '@/lib/cv-accent';
import { DEFAULT_EDITOR_STATE, type CVEditorState } from '@/lib/cv-editor-state';
import { cvProfileToEditorState } from '@/lib/cv-profile-to-editor-state';
import { universalToProfilePayload } from '@/lib/cv-universal-bridge';
import { createEmptyCVData, migrateLegacyCVData } from '@/src/utils/cvDefaults';
import type { CVProfile } from '@/types';

export const CV_DRAFT_STORAGE_KEY = 'cv_draft';
export const CV_DRAFT_FORCE_KEY = 'cv_draft_force_overwrite';
export const CV_DRAFT_UPDATED_EVENT = 'cv_draft_updated';

const DRAFT_VERSION = 2;

type DraftV2 = {
  v: 2;
  name: string;
  preferred_template_id: string;
  accent_color: string;
  font_family: string;
  cvData: unknown;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function isDraftV2(v: unknown): v is DraftV2 {
  return isRecord(v) && v.v === DRAFT_VERSION && isRecord(v.cvData);
}

function toV2Payload(state: CVEditorState): DraftV2 {
  return {
    v: DRAFT_VERSION,
    name: state.name,
    preferred_template_id: state.preferred_template_id,
    accent_color: state.accent_color,
    font_family: state.font_family,
    cvData: state.cvData,
  };
}

function draftV2ToState(raw: DraftV2): CVEditorState {
  const cvData = migrateLegacyCVData(raw.cvData);
  return {
    cvData,
    name: raw.name?.trim() || 'Untitled CV',
    preferred_template_id: raw.preferred_template_id || cvData.meta.templateId || 'classic',
    accent_color: raw.accent_color || cvData.meta.colorScheme || DEFAULT_CV_ACCENT,
    font_family: raw.font_family || cvData.meta.fontFamily || 'Inter',
  };
}

export function parseCvDraft(parsed: unknown): CVEditorState | null {
  if (!isRecord(parsed)) return null;
  if (isDraftV2(parsed)) return draftV2ToState(parsed);
  if (isRecord(parsed.personal)) {
    const cvData = migrateLegacyCVData(parsed);
    return {
      cvData,
      name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name : 'Untitled CV',
      preferred_template_id: cvData.meta.templateId ?? 'classic',
      accent_color: cvData.meta.colorScheme ?? DEFAULT_CV_ACCENT,
      font_family: cvData.meta.fontFamily ?? 'Inter',
    };
  }
  try {
    return cvProfileToEditorState(parsed as unknown as CVProfile);
  } catch {
    return null;
  }
}

export function notifyCvDraftUpdated(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(CV_DRAFT_UPDATED_EVENT));
}

export function hasCvDraft(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return Boolean(sessionStorage.getItem(CV_DRAFT_STORAGE_KEY));
  } catch {
    return false;
  }
}

export function readCvEditorDraft(): CVEditorState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CV_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    return parseCvDraft(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function writeCvEditorDraft(
  state: CVEditorState,
  options?: { forceOverwrite?: boolean; emitEvent?: boolean }
): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(CV_DRAFT_STORAGE_KEY, JSON.stringify(toV2Payload(state)));
    if (options?.forceOverwrite != null) {
      sessionStorage.setItem(CV_DRAFT_FORCE_KEY, options.forceOverwrite ? '1' : '0');
    }
    if (options?.emitEvent) notifyCvDraftUpdated();
  } catch {
    /* quota / private mode */
  }
}

export function writeCvDraftFromUnknown(
  raw: unknown,
  options?: { forceOverwrite?: boolean; emitEvent?: boolean }
): void {
  const state = parseCvDraft(raw);
  if (!state) return;
  writeCvEditorDraft(state, options);
}

export function clearCvDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(CV_DRAFT_STORAGE_KEY);
    sessionStorage.removeItem(CV_DRAFT_FORCE_KEY);
    notifyCvDraftUpdated();
  } catch {
    /* ignore */
  }
}

export function editorStateToProfileOverlay(state: CVEditorState): CVProfile {
  return {
    name: state.name,
    ...universalToProfilePayload(state.cvData),
    preferred_template_id: state.preferred_template_id,
    accent_color: state.accent_color,
    font_family: state.font_family,
  } as CVProfile;
}

export function emptyCvEditorDraft(): CVEditorState {
  return {
    ...DEFAULT_EDITOR_STATE,
    cvData: createEmptyCVData('classic'),
  };
}
