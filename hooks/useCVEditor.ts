'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { CVData, CVProfile } from '@/types';
import { universalToProfilePayload } from '@/lib/cv-universal-bridge';
import { normalizeTemplateId } from '@/src/utils/cvDefaults';
import { useAuthStore } from '@/stores/useAuthStore';
import type { CVEditorState } from '@/lib/cv-editor-state';
import { DEFAULT_EDITOR_STATE } from '@/lib/cv-editor-state';
import {
  applyCvEditorDesign,
  cvProfileToEditorState,
} from '@/lib/cv-profile-to-editor-state';
import {
  clearCvDraft,
  emptyCvEditorDraft,
  readCvEditorDraft,
  writeCvEditorDraft,
} from '@/lib/cv-draft-storage';

function serializeEditorState(s: CVEditorState): string {
  return JSON.stringify(s);
}

export type { CVEditorState } from '@/lib/cv-editor-state';

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
  handleSave: (displayName?: string) => Promise<boolean>;
  editorState: CVEditorState;
  setEditorState: React.Dispatch<React.SetStateAction<CVEditorState>>;
  updateField: <K extends keyof CVData>(field: K, value: CVData[K]) => void;
  reloadFromServer: () => Promise<void>;
}

export function useCVEditor({ cvIdFromRoute }: UseCVEditorOptions): UseCVEditorReturn {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authInitialized = useAuthStore((s) => s.initialized);
  const startFreshRef = useRef(searchParams.get('new') === '1');
  const loadedKeyRef = useRef<string | null>(null);

  const [cvId, setCvId] = useState<string | null>(cvIdFromRoute ?? null);
  const [loadedProfile, setLoadedProfile] = useState<CVProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editorState, setEditorState] = useState<CVEditorState>(DEFAULT_EDITOR_STATE);
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const isNew = cvId === null;

  useEffect(() => {
    setCvId(cvIdFromRoute ?? null);
  }, [cvIdFromRoute]);

  const loadFromServer = useCallback(async () => {
    if (cvIdFromRoute) {
      setLoadError(null);
      try {
        const res = await fetch(`/api/cvs/${cvIdFromRoute}`);
        if (!res.ok) {
          setLoadError('Could not load this CV.');
          setHydrated(true);
          return;
        }
        const profile = (await res.json()) as CVProfile;
        setLoadedProfile(profile);
        const serverState = cvProfileToEditorState(profile);
        setEditorState(serverState);
        setSavedSnapshot(serializeEditorState(serverState));
        setHydrated(true);
      } catch {
        setLoadError('Could not load this CV.');
        setHydrated(true);
      }
      return;
    }

    if (!authInitialized) {
      return;
    }

    setLoadedProfile(null);
    setLoadError(null);

    if (startFreshRef.current) {
      startFreshRef.current = false;
      const empty = emptyCvEditorDraft();
      writeCvEditorDraft(empty, { forceOverwrite: false, emitEvent: true });
      setEditorState(empty);
      setSavedSnapshot(null);
      setHydrated(true);
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.has('new')) {
          url.searchParams.delete('new');
          window.history.replaceState({}, '', url.toString());
        }
      } catch {
        /* ignore */
      }
      return;
    }

    const draft = readCvEditorDraft();
    setEditorState(draft ?? { ...DEFAULT_EDITOR_STATE });
    setSavedSnapshot(null);
    setHydrated(true);
  }, [authInitialized, cvIdFromRoute]);

  useEffect(() => {
    const key = cvIdFromRoute ?? (authInitialized ? '__new__' : null);
    if (key === null) return;
    if (loadedKeyRef.current === key) return;
    loadedKeyRef.current = key;
    void loadFromServer();
  }, [cvIdFromRoute, authInitialized, loadFromServer]);

  const reloadFromServer = useCallback(async () => {
    loadedKeyRef.current = null;
    setHydrated(false);
    await loadFromServer();
    loadedKeyRef.current = cvIdFromRoute ?? (authInitialized ? '__new__' : null);
  }, [authInitialized, cvIdFromRoute, loadFromServer]);

  const isDirty = useMemo(() => {
    if (savedSnapshot === null) return true;
    return serializeEditorState(editorState) !== savedSnapshot;
  }, [editorState, savedSnapshot]);

  const isLoading = Boolean(!hydrated || (!cvIdFromRoute && !authInitialized));

  const saveButtonLabel = useMemo(() => {
    if (isSaving) return 'Saving...';
    if (saveError) return 'Retry Save';
    return isNew ? 'Save CV' : 'Save';
  }, [isSaving, saveError, isNew]);

  const updateField = useCallback(<K extends keyof CVData>(field: K, value: CVData[K]) => {
    setEditorState((prev) => {
      if (!prev) return prev;
      return { ...prev, cvData: { ...prev.cvData, [field]: value } };
    });
  }, []);

  const buildPatchBody = useCallback((st: CVEditorState): Record<string, unknown> => {
    const cv = applyCvEditorDesign(
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

  const applySavedProfile = useCallback((updated: CVProfile) => {
    const st = cvProfileToEditorState(updated);
    setLoadedProfile(updated);
    setEditorState(st);
    setSavedSnapshot(serializeEditorState(st));
  }, []);

  const handleSave = useCallback(async (displayName?: string): Promise<boolean> => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const resolvedName =
        displayName?.trim() ||
        editorState.name.trim() ||
        editorState.cvData.personal.fullName?.trim() ||
        'Untitled CV';
      const stateForSave: CVEditorState = { ...editorState, name: resolvedName };

      if (isNew) {
        const createRes = await fetch('/api/cvs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: resolvedName }),
        });
        if (!createRes.ok) {
          const j = (await createRes.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error ?? 'Could not create CV');
        }
        const created = (await createRes.json()) as CVProfile;
        const newId = created.id;
        const patchRes = await fetch(`/api/cvs/${newId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildPatchBody(stateForSave)),
        });
        if (!patchRes.ok) {
          const j = (await patchRes.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error ?? 'Could not save CV content');
        }
        const updated = (await patchRes.json()) as CVProfile;
        setCvId(newId);
        loadedKeyRef.current = newId;
        applySavedProfile(updated);
        clearCvDraft();
        router.replace(`/cv/edit/${newId}`);
      } else {
        const patchRes = await fetch(`/api/cvs/${cvId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildPatchBody(stateForSave)),
        });
        if (!patchRes.ok) {
          const j = (await patchRes.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error ?? 'Could not update CV');
        }
        const updated = (await patchRes.json()) as CVProfile;
        applySavedProfile(updated);
      }
      return true;
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [editorState, isNew, cvId, buildPatchBody, router, applySavedProfile]);

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
    reloadFromServer,
  };
}
