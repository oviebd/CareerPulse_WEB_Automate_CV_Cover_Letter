'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/useAuthStore';
import type { CVProfile } from '@/types';
import { dbRowToCvProfile } from '@/lib/cv-mapper';
import { useEffect, useState } from 'react';

export type CoreCVVersion = {
  id: string;
  name: string;
  full_name: string | null;
  completion_percentage: number;
  is_complete: boolean;
  created_at: string;
  preferred_template_id: string | null;
};

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
    const raw = sessionStorage.getItem('cv_draft');
    if (!raw) {
      setDraft(null);
      setDraftLoaded(true);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as CVProfile & { user_id?: string };
      if (userId && parsed.user_id && parsed.user_id !== userId) {
        setDraft(null);
      } else {
        setDraft(parsed as CVProfile);
      }
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
    window.addEventListener('cv_draft_updated', onUpdate);
    return () => window.removeEventListener('cv_draft_updated', onUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return useQuery({
    queryKey: ['cv-profile', userId, coreCvId ?? 'latest'],
    queryFn: async (): Promise<CVProfile | null> => {
      if (!userId) return null;
      const supabase = createClient();
      if (coreCvId) {
        const { data, error } = await supabase
          .from('cvs')
          .select('*')
          .eq('user_id', userId)
          .eq('id', coreCvId)
          .maybeSingle();
        if (error) throw error;
        return data ? dbRowToCvProfile(data as Record<string, unknown>) : null;
      }
      const { data: rows, error } = await supabase
        .from('cvs')
        .select('*')
        .eq('user_id', userId)
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
        .limit(40);
      if (error) throw error;
      const list = (rows ?? []) as Record<string, unknown>[];
      const general = list.find(
        (r) => !Array.isArray(r.job_ids) || (r.job_ids as string[]).length === 0
      );
      return general ? dbRowToCvProfile(general) : null;
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
