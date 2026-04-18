'use client';

import { useEffect } from 'react';
import { useCVDocumentStore } from '@/src/store/cvStore';
import { buildCvProfilePatchPayload } from '@/lib/cv-build-save-payload';

const DEFAULT_DELAY_MS = 2800;

/**
 * Debounced PATCH to `/api/cvs/:id` for persisted core CVs only.
 * Does not run for new (unsaved) CVs or when not dirty.
 */
export function useCvAutosave(options: {
  cvId: string | null;
  isNew: boolean;
  delayMs?: number;
}) {
  const { cvId, isNew, delayMs = DEFAULT_DELAY_MS } = options;
  const isDirty = useCVDocumentStore((s) => s.isDirty);
  const cvData = useCVDocumentStore((s) => s.cvData);

  useEffect(() => {
    if (!cvId || isNew || !isDirty) return;

    const t = window.setTimeout(() => {
      const st = useCVDocumentStore.getState();
      if (!st.isDirty || !st.cvData || st.isSaving) return;

      st.setIsSaving(true);
      const payload = buildCvProfilePatchPayload({
        cvData: st.cvData,
        name: st.name,
        preferred_template_id: st.preferred_template_id,
        accent_color: st.accent_color,
        font_family: st.font_family,
      });

      void fetch(`/api/cvs/${cvId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(async (res) => {
          if (!res.ok) return;
          useCVDocumentStore.getState().markPristine();
        })
        .finally(() => {
          useCVDocumentStore.getState().setIsSaving(false);
        });
    }, delayMs);

    return () => window.clearTimeout(t);
  }, [cvId, isNew, isDirty, delayMs, cvData]);
}
