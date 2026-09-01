'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/useAuthStore';
import { apiFetch } from '@/lib/api-fetch';
import type { CoverLetter } from '@/types';

export function useCoverLettersList() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['cover-letters', userId],
    queryFn: async (): Promise<CoverLetter[]> => {
      if (!userId) return [];
      return apiFetch<CoverLetter[]>('/api/cover-letters');
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCoverLetter(id: string | undefined) {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['cover-letter', id, userId],
    queryFn: async (): Promise<CoverLetter | null> => {
      if (!id || !userId) return null;
      return apiFetch<CoverLetter>(`/api/cover-letters/${id}`);
    },
    enabled: Boolean(id) && !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useDeleteCoverLetter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/api/cover-letters/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['cover-letters'] });
    },
  });
}

export function useToggleCoverLetterFavourite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      is_favourited,
    }: {
      id: string;
      is_favourited: boolean;
    }) => {
      await apiFetch(`/api/cover-letters/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_favourited }),
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['cover-letters'] });
    },
  });
}

export function useUpdateCoverLetter() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  return useMutation({
    mutationFn: async (payload: {
      id: string;
      content: string;
      template_id: string;
      company_name: string | null;
      job_title: string | null;
      applicant_name: string | null;
      applicant_role: string | null;
      applicant_email: string | null;
      applicant_phone: string | null;
      applicant_location: string | null;
    }): Promise<CoverLetter> => {
      return apiFetch<CoverLetter>(`/api/cover-letters/${payload.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          content: payload.content,
          template_id: payload.template_id,
          company_name: payload.company_name,
          job_title: payload.job_title,
          applicant_name: payload.applicant_name,
          applicant_role: payload.applicant_role,
          applicant_email: payload.applicant_email,
          applicant_phone: payload.applicant_phone,
          applicant_location: payload.applicant_location,
        }),
      });
    },
    onSuccess: (data, v) => {
      qc.setQueryData(['cover-letter', v.id, userId], data);
      void qc.invalidateQueries({ queryKey: ['cover-letters'] });
    },
  });
}
