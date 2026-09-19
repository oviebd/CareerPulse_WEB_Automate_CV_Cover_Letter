'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type AutosaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

const DEFAULT_DELAY_MS = 5000;

export interface UseDebouncedAutosaveOptions {
  isDirty: boolean;
  enabled: boolean;
  save: () => Promise<boolean>;
  delayMs?: number;
  /** Bump when document content changes while dirty (resets the debounce timer). */
  revision?: string | number;
  /** When true, do not surface pending/saving/saved status (background autosave). */
  quiet?: boolean;
}

export interface UseDebouncedAutosaveReturn {
  status: AutosaveStatus;
  hasPendingSave: boolean;
  flush: () => Promise<boolean>;
  cancel: () => void;
}

export function useDebouncedAutosave({
  isDirty,
  enabled,
  save,
  delayMs = DEFAULT_DELAY_MS,
  revision = 0,
  quiet = false,
}: UseDebouncedAutosaveOptions): UseDebouncedAutosaveReturn {
  const saveRef = useRef(save);
  saveRef.current = save;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const dirtyRef = useRef(isDirty);
  dirtyRef.current = isDirty;

  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const [hasPendingTimer, setHasPendingTimer] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setHasPendingTimer(false);
  }, []);

  const runSave = useCallback(async (): Promise<boolean> => {
    if (savingRef.current) return false;
    savingRef.current = true;
    setIsSaving(true);
    if (!quiet) setStatus('saving');
    try {
      const ok = await saveRef.current();
      if (ok) {
        if (!quiet) {
          setStatus('saved');
          window.setTimeout(() => setStatus((s) => (s === 'saved' ? 'idle' : s)), 1800);
        }
      } else {
        setStatus('error');
      }
      return ok;
    } catch {
      setStatus('error');
      return false;
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }, [quiet]);

  const waitForSaveIdle = useCallback(async () => {
    while (savingRef.current) {
      await new Promise((r) => setTimeout(r, 50));
    }
  }, []);

  const flush = useCallback(async (): Promise<boolean> => {
    clearTimer();
    if (!enabled) return true;
    await waitForSaveIdle();
    if (!dirtyRef.current) return true;
    return runSave();
  }, [clearTimer, enabled, runSave, waitForSaveIdle]);

  const cancel = useCallback(() => {
    clearTimer();
    if (!savingRef.current) setStatus('idle');
  }, [clearTimer]);

  useEffect(() => {
    if (!enabled || !isDirty) {
      clearTimer();
      return;
    }

    clearTimer();
    if (!quiet) setStatus('pending');
    setHasPendingTimer(true);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setHasPendingTimer(false);
      void runSave();
    }, delayMs);

    return () => clearTimer();
  }, [enabled, isDirty, delayMs, revision, quiet, clearTimer, runSave]);

  const hasPendingSave = hasPendingTimer || isSaving;

  return {
    status,
    hasPendingSave,
    flush,
    cancel,
  };
}
