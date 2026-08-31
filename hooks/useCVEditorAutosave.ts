'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type CVAutosaveState = 'idle' | 'saving' | 'saved' | 'error';

export interface UseCVEditorAutosaveOptions {
  /** Serialized editor state — triggers debounced save when changed while dirty. */
  stateKey: string;
  cvId: string | null;
  isNew: boolean;
  isDirty: boolean;
  isSaving: boolean;
  handleSave: (displayName?: string) => Promise<boolean>;
  enabled?: boolean;
  debounceMs?: number;
}

export function useCVEditorAutosave({
  stateKey,
  cvId,
  isNew,
  isDirty,
  isSaving,
  handleSave,
  enabled = true,
  debounceMs = 800,
}: UseCVEditorAutosaveOptions) {
  const [autosaveState, setAutosaveState] = useState<CVAutosaveState>('idle');
  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;

  const retryAutosave = useCallback(async () => {
    if (!cvId || isNew) return;
    setAutosaveState('saving');
    const ok = await handleSaveRef.current();
    setAutosaveState(ok ? 'saved' : 'error');
  }, [cvId, isNew]);

  useEffect(() => {
    if (!enabled) return;

    if (isNew || !cvId) {
      setAutosaveState(isDirty ? 'idle' : 'idle');
      return;
    }

    if (!isDirty) {
      setAutosaveState('saved');
      return;
    }

    if (isSaving) return;

    setAutosaveState('saving');
    const timer = window.setTimeout(() => {
      void (async () => {
        const ok = await handleSaveRef.current();
        setAutosaveState(ok ? 'saved' : 'error');
      })();
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [stateKey, cvId, isNew, isDirty, isSaving, enabled, debounceMs]);

  return { autosaveState, retryAutosave };
}
