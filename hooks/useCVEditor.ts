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
import {
  defaultCoreCvDisplayNameFromCreatedAt,
  isPlaceholderCvName,
  resolveFullNameForCvTitle,
} from '@/lib/cv-display-name';
import { useDebouncedAutosave, type AutosaveStatus } from '@/hooks/useDebouncedAutosave';
import { resolvePostSaveAck } from '@/lib/cv-editor-save-ack';

function serializeEditorState(s: CVEditorState): string {
  return JSON.stringify(s);
}

async function fetchAccountFullName(): Promise<string | null> {
  try {
    const res = await fetch('/api/account');
    if (!res.ok) return null;
    const data = (await res.json()) as { full_name?: string | null };
    return data.full_name?.trim() || null;
  } catch {
    return null;
  }
}

async function fetchLatestCvFullName(): Promise<string | null> {
  try {
    const res = await fetch('/api/cvs/profile');
    if (!res.ok) return null;
    const data = (await res.json()) as { full_name?: string | null } | null;
    return data?.full_name?.trim() || null;
  } catch {
    return null;
  }
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
  hasUnsavedWork: boolean;
  autosaveStatus: AutosaveStatus;
  saveButtonLabel: string;
  handleSave: (displayName?: string, options?: { silent?: boolean }) => Promise<boolean>;
  renameCv: (displayName: string) => Promise<boolean>;
  flushAutosave: () => Promise<boolean>;
  cancelAutosave: () => void;
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
  const autoCreateRef = useRef(false);
  const editorStateRef = useRef<CVEditorState>(DEFAULT_EDITOR_STATE);

  const [cvId, setCvId] = useState<string | null>(cvIdFromRoute ?? null);
  const [loadedProfile, setLoadedProfile] = useState<CVProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editorState, setEditorState] = useState<CVEditorState>(DEFAULT_EDITOR_STATE);
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  editorStateRef.current = editorState;

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
    autoCreateRef.current = false;
    setHydrated(false);
    await loadFromServer();
    loadedKeyRef.current = cvIdFromRoute ?? (authInitialized ? '__new__' : null);
  }, [authInitialized, cvIdFromRoute, loadFromServer]);

  const isDirty = useMemo(() => {
    if (savedSnapshot === null) return true;
    return serializeEditorState(editorState) !== savedSnapshot;
  }, [editorState, savedSnapshot]);

  const isLoading = Boolean(!hydrated || (!cvIdFromRoute && !authInitialized));

  const resolveSuggestedName = useCallback(
    (st: CVEditorState, createdAt?: string | null) => {
      const fullName = resolveFullNameForCvTitle(
        st.cvData.personal.fullName,
        loadedProfile?.full_name,
        null
      );
      return defaultCoreCvDisplayNameFromCreatedAt(fullName, createdAt ?? loadedProfile?.created_at);
    },
    [loadedProfile?.created_at, loadedProfile?.full_name]
  );

  const buildPatchBody = useCallback(
    (st: CVEditorState, opts?: { explicitName?: string }): Record<string, unknown> => {
      const cv = applyCvEditorDesign(
        st.cvData,
        st.preferred_template_id,
        st.accent_color,
        st.font_family
      );
      const body: Record<string, unknown> = {
        ...universalToProfilePayload(cv),
        font_family: st.font_family,
        accent_color: st.accent_color,
        preferred_template_id: normalizeTemplateId(st.preferred_template_id),
        original_cv_file_url: null,
      };
      if (opts?.explicitName?.trim()) {
        body.name = opts.explicitName.trim();
      } else if (isPlaceholderCvName(st.name)) {
        body.name = resolveSuggestedName(st);
      }
      return body;
    },
    [resolveSuggestedName]
  );

  const applySavedProfileIfCurrent = useCallback(
    (updated: CVProfile, snapshotSaved: string) => {
      const currentSnap = serializeEditorState(editorStateRef.current);
      const ack = resolvePostSaveAck(
        currentSnap,
        snapshotSaved,
        updated,
        editorStateRef.current
      );
      setLoadedProfile(updated);
      if (ack.kind === 'snapshot_only') {
        setSavedSnapshot(ack.savedSnapshot);
        return;
      }
      setEditorState(ack.editorState);
      setSavedSnapshot(ack.savedSnapshot);
    },
    []
  );

  const handleSave = useCallback(
    async (displayName?: string, options?: { silent?: boolean }): Promise<boolean> => {
      const stateAtStart = editorStateRef.current;
      let resolvedName = displayName?.trim();
      if (!resolvedName) {
        if (!isPlaceholderCvName(stateAtStart.name)) {
          resolvedName = stateAtStart.name.trim();
        } else {
          const [cvFullName, accountFullName] = await Promise.all([
            fetchLatestCvFullName(),
            fetchAccountFullName(),
          ]);
          const fullName = resolveFullNameForCvTitle(
            stateAtStart.cvData.personal.fullName,
            cvFullName,
            accountFullName
          );
          resolvedName = defaultCoreCvDisplayNameFromCreatedAt(
            fullName,
            loadedProfile?.created_at
          );
        }
      }
      const stateForSave: CVEditorState = { ...stateAtStart, name: resolvedName };
      const snapshotForSave = serializeEditorState(stateForSave);
      const nameOverride = displayName?.trim() || (isPlaceholderCvName(stateAtStart.name) ? resolvedName : undefined);

      const silent = options?.silent ?? false;
      if (!silent) setIsSaving(true);
      setSaveError(null);
      try {
        if (cvId === null) {
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
            body: JSON.stringify(buildPatchBody(stateForSave, { explicitName: resolvedName })),
          });
          if (!patchRes.ok) {
            const j = (await patchRes.json().catch(() => ({}))) as { error?: string };
            throw new Error(j.error ?? 'Could not save CV content');
          }
          const updated = (await patchRes.json()) as CVProfile;
          setCvId(newId);
          loadedKeyRef.current = newId;
          applySavedProfileIfCurrent(updated, snapshotForSave);
          clearCvDraft();
          router.replace(`/cv/edit/${newId}`);
        } else {
          const patchBody = buildPatchBody(stateForSave, {
            explicitName: nameOverride,
          });
          const patchRes = await fetch(`/api/cvs/${cvId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patchBody),
          });
          if (!patchRes.ok) {
            const j = (await patchRes.json().catch(() => ({}))) as { error?: string };
            throw new Error(j.error ?? 'Could not update CV');
          }
          const updated = (await patchRes.json()) as CVProfile;
          applySavedProfileIfCurrent(updated, snapshotForSave);
        }
        return true;
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : 'Save failed');
        return false;
      } finally {
        if (!silent) setIsSaving(false);
      }
    },
    [cvId, buildPatchBody, router, applySavedProfileIfCurrent, loadedProfile?.created_at]
  );

  const renameCv = useCallback(
    async (displayName: string): Promise<boolean> => {
      const trimmed = displayName.trim();
      if (!trimmed) return false;
      return handleSave(trimmed, { silent: false });
    },
    [handleSave]
  );

  useEffect(() => {
    if (!hydrated || !loadedProfile) return;
    if (!isPlaceholderCvName(loadedProfile.name)) return;
    const suggested = resolveSuggestedName(
      cvProfileToEditorState(loadedProfile),
      loadedProfile.created_at
    );
    setEditorState((prev) => {
      if (!isPlaceholderCvName(prev.name)) return prev;
      return { ...prev, name: suggested };
    });
  }, [hydrated, loadedProfile, resolveSuggestedName]);

  const autosaveEnabled = hydrated && cvId !== null && !loadError;

  const autosaveRevision = useMemo(
    () => serializeEditorState(editorState),
    [editorState]
  );

  const { status: autosaveStatus, hasPendingSave, flush, cancel } = useDebouncedAutosave({
    isDirty,
    enabled: autosaveEnabled && !isSaving,
    save: () => handleSave(undefined, { silent: true }),
    revision: isDirty ? autosaveRevision : 0,
    quiet: true,
  });

  const hasUnsavedWork = isDirty || hasPendingSave || isSaving;

  useEffect(() => {
    if (!hydrated || cvIdFromRoute || cvId !== null || loadError || autoCreateRef.current) {
      return;
    }
    autoCreateRef.current = true;
    void handleSave(undefined, { silent: true });
  }, [hydrated, cvIdFromRoute, cvId, loadError, handleSave]);

  const saveButtonLabel = useMemo(() => {
    if (isSaving) return 'Saving...';
    if (saveError || autosaveStatus === 'error') return 'Retry Save';
    return 'Save';
  }, [isSaving, saveError, autosaveStatus]);

  const updateField = useCallback(<K extends keyof CVData>(field: K, value: CVData[K]) => {
    setEditorState((prev) => {
      if (!prev) return prev;
      return { ...prev, cvData: { ...prev.cvData, [field]: value } };
    });
  }, []);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!hasUnsavedWork) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasUnsavedWork]);

  return {
    cv: loadedProfile,
    cvId,
    isNew,
    isSaving,
    saveError,
    loadError,
    isLoading,
    isDirty,
    hasUnsavedWork,
    autosaveStatus,
    saveButtonLabel,
    handleSave,
    renameCv,
    flushAutosave: flush,
    cancelAutosave: cancel,
    editorState,
    setEditorState,
    updateField,
    reloadFromServer,
  };
}
