'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/useAuthStore';
import type { JobSpecificCV } from '@/types';

export function useJobSpecificCVs() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['job-specific-cvs', userId],
    queryFn: async (): Promise<JobSpecificCV[]> => {
      const res = await fetch('/api/cv/job-specific');
      if (!res.ok) throw new Error('Failed to fetch job CVs');
      const json = await res.json();
      return json.job_cvs ?? [];
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useJobSpecificCV(id: string) {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['job-specific-cv', id],
    queryFn: async (): Promise<JobSpecificCV | null> => {
      const res = await fetch(`/api/cv/job-specific/${id}`);
      if (!res.ok) throw new Error('Failed to fetch job CV');
      const json = await res.json();
      return json.job_cv ?? null;
    },
    enabled: !!userId && !!id,
    staleTime: 60 * 1000,
  });
}

export function useSaveJobSpecificCV() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      job_title: string;
      company_name?: string | null;
      job_description: string;
      cv_data: Record<string, unknown>;
      ai_changes_summary?: string | null;
      keywords_added?: string[];
      bullets_improved?: number;
      preferred_template_id?: string | null;
      accent_color?: string;
      job_application_id?: string | null;
    }): Promise<{ id: string }> => {
      const res = await fetch('/api/cv/job-specific', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to save job CV');
      return res.json();
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['job-specific-cvs'] });
    },
  });
}

export function useUpdateJobSpecificCV(id: string) {
  const qc = useQueryClient();
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<Record<string, unknown> | null>(null);

  const mutation = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const res = await fetch(`/api/cv/job-specific/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error('Failed to update job CV');
      return res.json();
    },
    onSuccess: () => {
      setLastSaved(new Date());
      void qc.invalidateQueries({ queryKey: ['job-specific-cv', id] });
    },
  });

  const update = useCallback(
    (patch: Record<string, unknown>) => {
      pendingRef.current = patch;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (pendingRef.current) {
          mutation.mutate(pendingRef.current);
          pendingRef.current = null;
        }
      }, 1500);
    },
    [mutation]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (pendingRef.current) {
        mutation.mutate(pendingRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    update,
    isSaving: mutation.isPending,
    lastSaved,
  };
}

export function useArchiveJobSpecificCV() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/cv/job-specific/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to archive job CV');
      return res.json();
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['job-specific-cvs'] });
    },
  });
}
