'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CVData, CVProfile } from '@/types';
import { cvProfileToCvData } from '@/lib/cv-profile-cvdata';
import { universalToProfilePayload } from '@/lib/cv-universal-bridge';
import { createEmptyCVData } from '@/src/utils/cvDefaults';
import { normalizeTemplateId } from '@/src/utils/cvDefaults';
import { TEMPLATE_CONFIGS } from '@/src/config/templateConfig';
import type { TemplateId } from '@/src/types/cv.types';

export interface CVEditorState {
  cvData: CVData;
  name: string;
  preferred_template_id: string;
  accent_color: string;
  font_family: string;
}

function applyDesignToCv(
  cv: CVData,
  templateId: string,
  accent: string,
  font: string
): CVData {
  const tid = normalizeTemplateId(templateId) as TemplateId;
  const cfg = TEMPLATE_CONFIGS[tid];
  return {
    ...cv,
    meta: {
      ...cv.meta,
      templateId: tid,
      colorScheme: accent,
      fontFamily: font,
      layout:
        cfg.layout === 'two-column' ? 'two-column' : 'single-column',
      showPhoto: cfg.showPhoto,
      sectionOrder: [...cfg.sectionOrder],
    },
  };
}

function serializeEditorState(s: CVEditorState): string {
  return JSON.stringify(s);
}

const DEFAULT_EDITOR_STATE: CVEditorState = {
  cvData: createEmptyCVData('classic'),
  name: 'Untitled CV',
  preferred_template_id: 'classic',
  accent_color: '#6C63FF',
  font_family: 'Inter',
};

export interface UseCVEditorOptions {
  cvIdFromRoute: string | undefined;
}

export interface UseCVEditorReturn {
  cv: CVProfile | null;
  cvId: string | null;
  isNew: boolean;
  isSaving: boolean;
  saveError: string | null;
  loadError: string | null;
  isLoading: boolean;
  isDirty: boolean;
  saveButtonLabel: string;
  handleSave: () => Promise<void>;
  editorState: CVEditorState;
  setEditorState: React.Dispatch<React.SetStateAction<CVEditorState>>;
  updateField: <K extends keyof CVData>(field: K, value: CVData[K]) => void;
  reloadFromServer: () => Promise<void>;
}

export function useCVEditor({ cvIdFromRoute }: UseCVEditorOptions): UseCVEditorReturn {
  const router = useRouter();
  const [cvId, setCvId] = useState<string | null>(cvIdFromRoute ?? null);
  const [loadedProfile, setLoadedProfile] = useState<CVProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editorState, setEditorState] = useState<CVEditorState>(DEFAULT_EDITOR_STATE);
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isNew = cvId === null;

  useEffect(() => {
    setCvId(cvIdFromRoute ?? null);
  }, [cvIdFromRoute]);

  const loadFromServer = useCallback(async () => {
    if (!cvIdFromRoute) {
      setLoadedProfile(null);
      setLoadError(null);
      if (typeof window !== 'undefined' && sessionStorage.getItem('cv_draft')) {
        try {
          const raw = sessionStorage.getItem('cv_draft');
          const parsed = raw ? (JSON.parse(raw) as CVData) : createEmptyCVData('classic');
          setEditorState({
            cvData: parsed,
            name: 'Untitled CV',
            preferred_template_id: parsed.meta?.templateId ?? 'classic',
            accent_color: parsed.meta?.colorScheme ?? '#6C63FF',
            font_family: parsed.meta?.fontFamily ?? 'Inter',
          });
          setSavedSnapshot(null);
        } catch {
          setEditorState({
            cvData: createEmptyCVData('classic'),
            name: 'Untitled CV',
            preferred_template_id: 'classic',
            accent_color: '#6C63FF',
            font_family: 'Inter',
          });
          setSavedSnapshot(null);
        }
        return;
      }
      setEditorState({ ...DEFAULT_EDITOR_STATE });
      setSavedSnapshot(null);
      return;
    }

    setLoadError(null);
    try {
      const res = await fetch(`/api/cvs/${cvIdFromRoute}`);
      if (!res.ok) {
        setLoadError('Could not load this CV.');
        return;
      }
      const profile = (await res.json()) as CVProfile;
      setLoadedProfile(profile);
      const tid = profile.preferred_template_id ?? 'classic';
      let cvData = cvProfileToCvData(profile);
      cvData = applyDesignToCv(
        cvData,
        tid,
        profile.accent_color ?? '#6C63FF',
        profile.font_family ?? 'Inter'
      );
      const st: CVEditorState = {
        cvData,
        name: profile.name ?? 'Untitled CV',
        preferred_template_id: tid,
        accent_color: profile.accent_color ?? '#6C63FF',
        font_family: profile.font_family ?? 'Inter',
      };
      setEditorState(st);
      setSavedSnapshot(serializeEditorState(st));
    } catch {
      setLoadError('Could not load this CV.');
    }
  }, [cvIdFromRoute]);

  useEffect(() => {
    void loadFromServer();
  }, [loadFromServer]);

  const isDirty = useMemo(() => {
    if (savedSnapshot === null) return true;
    return serializeEditorState(editorState) !== savedSnapshot;
  }, [editorState, savedSnapshot]);

  const isLoading = Boolean(cvIdFromRoute && !loadedProfile && !loadError);

  const saveButtonLabel = useMemo(() => {
    if (isSaving) return 'Saving...';
    if (saveError) return 'Retry Save';
    return isNew ? 'Save CV' : 'Update CV';
  }, [isSaving, saveError, isNew]);

  const updateField = useCallback(<K extends keyof CVData>(field: K, value: CVData[K]) => {
    setEditorState((prev) => {
      if (!prev) return prev;
      return { ...prev, cvData: { ...prev.cvData, [field]: value } };
    });
  }, []);

  const buildPatchBody = useCallback((st: CVEditorState): Record<string, unknown> => {
    const cv = applyDesignToCv(
      st.cvData,
      st.preferred_template_id,
      st.accent_color,
      st.font_family
    );
    return {
      name: st.name.trim() || 'Untitled CV',
      ...universalToProfilePayload(cv),
      font_family: st.font_family,
      accent_color: st.accent_color,
      preferred_template_id: normalizeTemplateId(st.preferred_template_id),
      original_cv_file_url: null,
    };
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      if (isNew) {
        const name =
          editorState.name.trim() ||
          editorState.cvData.personal.fullName?.trim() ||
          'Untitled CV';
        const createRes = await fetch('/api/cvs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });
        if (!createRes.ok) {
          const j = (await createRes.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error ?? 'Could not create CV');
        }
        const created = (await createRes.json()) as CVProfile;
        const newId = created.id;
        const patch = buildPatchBody(editorState);
        const patchRes = await fetch(`/api/cvs/${newId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
        if (!patchRes.ok) {
          const j = (await patchRes.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error ?? 'Could not save CV content');
        }
        const updated = (await patchRes.json()) as CVProfile;
        setCvId(newId);
        setLoadedProfile(updated);
        let cvData = cvProfileToCvData(updated);
        cvData = applyDesignToCv(
          cvData,
          updated.preferred_template_id ?? 'classic',
          updated.accent_color ?? '#6C63FF',
          updated.font_family ?? 'Inter'
        );
        const st: CVEditorState = {
          cvData,
          name: updated.name ?? 'Untitled CV',
          preferred_template_id: updated.preferred_template_id ?? 'classic',
          accent_color: updated.accent_color ?? '#6C63FF',
          font_family: updated.font_family ?? 'Inter',
        };
        setEditorState(st);
        setSavedSnapshot(serializeEditorState(st));
        try {
          sessionStorage.removeItem('cv_draft');
          sessionStorage.removeItem('cv_draft_force_overwrite');
          window.dispatchEvent(new Event('cv_draft_updated'));
        } catch {
          /* ignore */
        }
        router.replace(`/cv/edit/${newId}`);
      } else {
        const patch = buildPatchBody(editorState);
        const patchRes = await fetch(`/api/cvs/${cvId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
        if (!patchRes.ok) {
          const j = (await patchRes.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error ?? 'Could not update CV');
        }
        const updated = (await patchRes.json()) as CVProfile;
        setLoadedProfile(updated);
        let cvData = cvProfileToCvData(updated);
        cvData = applyDesignToCv(
          cvData,
          updated.preferred_template_id ?? 'classic',
          updated.accent_color ?? '#6C63FF',
          updated.font_family ?? 'Inter'
        );
        const st: CVEditorState = {
          cvData,
          name: updated.name ?? 'Untitled CV',
          preferred_template_id: updated.preferred_template_id ?? 'classic',
          accent_color: updated.accent_color ?? '#6C63FF',
          font_family: updated.font_family ?? 'Inter',
        };
        setEditorState(st);
        setSavedSnapshot(serializeEditorState(st));
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  }, [editorState, isNew, cvId, buildPatchBody, router]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  return {
    cv: loadedProfile,
    cvId,
    isNew,
    isSaving,
    saveError,
    loadError,
    isLoading,
    isDirty,
    saveButtonLabel,
    handleSave,
    editorState,
    setEditorState,
    updateField,
    reloadFromServer: loadFromServer,
  };
}
