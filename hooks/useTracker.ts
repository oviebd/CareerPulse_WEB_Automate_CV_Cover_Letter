'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/useAuthStore';
import type { ApplicationStatus, JobApplication } from '@/types';

export function useJobApplications() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['job-applications', userId],
    queryFn: async (): Promise<JobApplication[]> => {
      if (!userId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from('job_applications')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as JobApplication[];
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}

export function useUpdateApplicationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: ApplicationStatus;
    }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('job_applications')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['job-applications'] });
    },
  });
}

export function useUpsertJobApplication() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  return useMutation({
    mutationFn: async (
      payload: Partial<JobApplication> & { company_name: string; job_title: string }
    ) => {
      if (!userId) throw new Error('Unauthorized');
      const supabase = createClient();
      if (payload.id) {
        const { data, error } = await supabase
          .from('job_applications')
          .update(payload)
          .eq('id', payload.id)
          .eq('user_id', userId)
          .select()
          .single();
        if (error) throw error;
        return data as JobApplication;
      }
      const { data, error } = await supabase
        .from('job_applications')
        .insert({ ...payload, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      return data as JobApplication;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['job-applications'] });
    },
  });
}

