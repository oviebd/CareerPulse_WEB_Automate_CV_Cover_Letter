'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CVData, CVProfile } from '@/types';
import { cvProfileToCvData } from '@/lib/cv-profile-cvdata';
import { buildCvProfilePatchPayload } from '@/lib/cv-build-save-payload';
import { applyDesignToCv } from '@/lib/cv-apply-design';
import { createEmptyCVData } from '@/src/utils/cvDefaults';
import { normalizeTemplateId } from '@/src/utils/cvDefaults';
import { useCVDocumentStore } from '@/src/store/cvStore';

export interface CVEditorState {
  cvData: CVData;
  name: string;
  preferred_template_id: string;
  accent_color: string;
  font_family: string;
}

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
  reloadFromServer: () => Promise<void>;
}

function hydrateFromEditorState(st: CVEditorState, isDirty: boolean) {
  useCVDocumentStore.getState().hydrate({
    cvData: st.cvData,
    name: st.name,
    preferred_template_id: st.preferred_template_id,
    accent_color: st.accent_color,
    font_family: st.font_family,
    isDirty,
  });
}

export function useCVEditor({ cvIdFromRoute }: UseCVEditorOptions): UseCVEditorReturn {
  const router = useRouter();
  const [cvId, setCvId] = useState<string | null>(cvIdFromRoute ?? null);
  const [loadedProfile, setLoadedProfile] = useState<CVProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isNew = cvId === null;
  const isDirty = useCVDocumentStore((s) => s.isDirty);
  const isSaving = useCVDocumentStore((s) => s.isSaving);

  useEffect(() => {
    setCvId(cvIdFromRoute ?? null);
  }, [cvIdFromRoute]);

  const loadFromServer = useCallback(async () => {
    if (!cvIdFromRoute) {
      setLoadedProfile(null);
      setLoadError(null);
      useCVDocumentStore.getState().reset();
      if (typeof window !== 'undefined' && sessionStorage.getItem('cv_draft')) {
        try {
          const raw = sessionStorage.getItem('cv_draft');
          const parsed = raw ? (JSON.parse(raw) as CVData) : createEmptyCVData('classic');
          hydrateFromEditorState(
            {
              cvData: parsed,
              name: 'Untitled CV',
              preferred_template_id: parsed.meta?.templateId ?? 'classic',
              accent_color: parsed.meta?.colorScheme ?? '#6C63FF',
              font_family: parsed.meta?.fontFamily ?? 'Inter',
            },
            true
          );
        } catch {
          hydrateFromEditorState(
            {
              cvData: createEmptyCVData('classic'),
              name: 'Untitled CV',
              preferred_template_id: 'classic',
              accent_color: '#6C63FF',
              font_family: 'Inter',
            },
            true
          );
        }
        return;
      }
      hydrateFromEditorState(
        {
          cvData: createEmptyCVData('classic'),
          name: 'Untitled CV',
          preferred_template_id: 'classic',
          accent_color: '#6C63FF',
          font_family: 'Inter',
        },
        true
      );
      return;
    }

    setLoadError(null);
    useCVDocumentStore.getState().reset();
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
      hydrateFromEditorState(
        {
          cvData,
          name: profile.name ?? 'Untitled CV',
          preferred_template_id: tid,
          accent_color: profile.accent_color ?? '#6C63FF',
          font_family: profile.font_family ?? 'Inter',
        },
        false
      );
    } catch {
      setLoadError('Could not load this CV.');
    }
  }, [cvIdFromRoute]);

  useEffect(() => {
    void loadFromServer();
  }, [loadFromServer]);

  const isLoading = Boolean(cvIdFromRoute && !loadedProfile && !loadError);

  const saveButtonLabel = useMemo(() => {
    if (isSaving) return 'Saving...';
    if (saveError) return 'Retry Save';
    return isNew ? 'Save CV' : 'Update CV';
  }, [isSaving, saveError, isNew]);

  const handleSave = useCallback(async () => {
    useCVDocumentStore.getState().setIsSaving(true);
    setSaveError(null);
    const editorState = useCVDocumentStore.getState();
    try {
      if (isNew) {
        const name =
          editorState.name.trim() ||
          editorState.cvData?.personal.fullName?.trim() ||
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
        if (!editorState.cvData) throw new Error('No CV data');
        const patch = buildCvProfilePatchPayload({
          cvData: editorState.cvData,
          name: editorState.name,
          preferred_template_id: editorState.preferred_template_id,
          accent_color: editorState.accent_color,
          font_family: editorState.font_family,
        });
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
        hydrateFromEditorState(
          {
            cvData,
            name: updated.name ?? 'Untitled CV',
            preferred_template_id: updated.preferred_template_id ?? 'classic',
            accent_color: updated.accent_color ?? '#6C63FF',
            font_family: updated.font_family ?? 'Inter',
          },
          false
        );
        try {
          sessionStorage.removeItem('cv_draft');
          sessionStorage.removeItem('cv_draft_force_overwrite');
          window.dispatchEvent(new Event('cv_draft_updated'));
        } catch {
          /* ignore */
        }
        router.replace(`/cv/edit/${newId}`);
      } else {
        if (!editorState.cvData) throw new Error('No CV data');
        const patch = buildCvProfilePatchPayload({
          cvData: editorState.cvData,
          name: editorState.name,
          preferred_template_id: editorState.preferred_template_id,
          accent_color: editorState.accent_color,
          font_family: editorState.font_family,
        });
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
        hydrateFromEditorState(
          {
            cvData,
            name: updated.name ?? 'Untitled CV',
            preferred_template_id: updated.preferred_template_id ?? 'classic',
            accent_color: updated.accent_color ?? '#6C63FF',
            font_family: updated.font_family ?? 'Inter',
          },
          false
        );
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      useCVDocumentStore.getState().setIsSaving(false);
    }
  }, [isNew, cvId, router]);

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
    reloadFromServer: loadFromServer,
  };
}
