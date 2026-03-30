'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/useAuthStore';
import type { CVProfile } from '@/types';
import { useEffect, useState } from 'react';

export type CoreCVVersion = {
  id: string;
  full_name: string | null;
  completion_percentage: number;
  is_complete: boolean;
  created_at: string;
  preferred_cv_template_id: string | null;
};

export function useCoreCVVersions() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['cv-versions', userId],
    enabled: !!userId,
    queryFn: async (): Promise<CoreCVVersion[]> => {
      const res = await fetch('/api/cv/versions', { method: 'GET' });
      if (!res.ok) throw new Error('Failed to fetch core CV versions');
      const json = await res.json() as { versions: CoreCVVersion[] };
      return json.versions ?? [];
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
      // Safety: ignore drafts created for another user (shouldn't happen, but cheap to guard).
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
      let q = supabase.from('cv_profiles').select('*').eq('user_id', userId);
      if (coreCvId) {
        q = q.eq('id', coreCvId);
      } else {
        q = q.order('created_at', { ascending: false }).limit(1);
      }
      const { data, error } = await q.maybeSingle();
      if (error) throw error;
      return data as CVProfile | null;
    },
    enabled: !!userId && draftLoaded,
    staleTime: 5 * 60 * 1000,
    // If the user uploaded a CV, always prefer the draft over the DB row
    // (otherwise the editor will show the previously saved version).
    select: (data) => draft ?? data ?? null,
    initialData: draft ?? undefined,
  });
}

export function useUpdateCVProfile() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  return useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      if (!userId) throw new Error('Unauthorized');
      const supabase = createClient();
      const { data, error } = await supabase
        .from('cv_profiles')
        .update(patch)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;
      return data as CVProfile;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['cv-profile'] });
    },
  });
}

export function useDeleteCoreCVVersion() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/cv/versions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete core CV version');
      return res.json() as Promise<{ ok: boolean }>;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['cv-versions', userId] });
    },
  });
}
