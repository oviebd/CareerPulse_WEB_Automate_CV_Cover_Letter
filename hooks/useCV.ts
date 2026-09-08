'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/useAuthStore';
import { apiFetch } from '@/lib/api-fetch';
import type { CVProfile } from '@/types';
import { useEffect, useState } from 'react';
import {
  CV_DRAFT_UPDATED_EVENT,
  editorStateToProfileOverlay,
  readCvEditorDraft,
} from '@/lib/cv-draft-storage';

export type CoreCVVersion = {
  id: string;
  name: string;
  full_name: string | null;
  completion_percentage: number;
  is_complete: boolean;
  created_at: string;
  updated_at: string;
  preferred_template_id: string | null;
};

export type InterviewCVOption = CoreCVVersion;

export function useCoreCVVersions() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['cv-versions', userId],
    enabled: !!userId,
    queryFn: async (): Promise<CoreCVVersion[]> => {
      const res = await fetch('/api/cvs?generalOnly=true');
      if (!res.ok) throw new Error('Failed to fetch core CV versions');
      const json = (await res.json()) as CVProfile[];
      return (json ?? []).map((v) => ({
        id: v.id,
        name: v.name ?? 'Untitled CV',
        full_name: v.full_name,
        completion_percentage: v.completion_percentage,
        is_complete: v.is_complete,
        created_at: v.created_at,
        updated_at: v.updated_at,
        preferred_template_id: v.preferred_template_id ?? null,
      }));
    },
    staleTime: 30_000,
  });
}

export function useAllCVVersions() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['all-cvs', userId],
    enabled: !!userId,
    queryFn: async (): Promise<InterviewCVOption[]> => {
      const res = await fetch('/api/cvs');
      if (!res.ok) throw new Error('Failed to fetch CVs');
      const json = (await res.json()) as CVProfile[];
      return (json ?? []).map((v) => ({
        id: v.id,
        name: v.name ?? 'Untitled CV',
        full_name: v.full_name,
        completion_percentage: v.completion_percentage,
        is_complete: v.is_complete,
        created_at: v.created_at,
        updated_at: v.updated_at,
        preferred_template_id: v.preferred_template_id ?? null,
      }));
    },
    staleTime: 30_000,
  });
}

export function useCVProfile(coreCvId?: string | null) {
  const userId = useAuthStore((s) => s.user?.id);

  const [draft, setDraft] = useState<CVProfile | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);

  const loadDraft = () => {
    if (typeof window === 'undefined') return;
    const state = readCvEditorDraft();
    if (!state) {
      setDraft(null);
      setDraftLoaded(true);
      return;
    }
    try {
      setDraft(editorStateToProfileOverlay(state));
    } catch {
      setDraft(null);
    } finally {
      setDraftLoaded(true);
    }
  };

  useEffect(() => {
    setDraftLoaded(false);
    loadDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onUpdate = () => loadDraft();
    window.addEventListener(CV_DRAFT_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(CV_DRAFT_UPDATED_EVENT, onUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return useQuery({
    queryKey: ['cv-profile', userId, coreCvId ?? 'latest'],
    queryFn: async (): Promise<CVProfile | null> => {
      if (!userId) return null;
      const qs = coreCvId ? `?coreCvId=${encodeURIComponent(coreCvId)}` : '';
      return apiFetch<CVProfile | null>(`/api/cvs/profile${qs}`);
    },
    enabled: !!userId && draftLoaded,
    staleTime: 5 * 60 * 1000,
    select: (data) => draft ?? data ?? null,
    initialData: draft ?? undefined,
  });
}

export function useDeleteCoreCVVersion() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/cvs/${encodeURIComponent(id)}?hard=true`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete core CV version');
      return res.json() as Promise<{ ok: boolean }>;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['cv-versions', userId] });
    },
  });
}
