'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { ApplicationStatus, JobApplication } from '@/types';

export function useJobApplications() {
  return useQuery({
    queryKey: ['job-applications'],
    queryFn: async (): Promise<JobApplication[]> => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from('job_applications')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as JobApplication[];
    },
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
  return useMutation({
    mutationFn: async (
      payload: Partial<JobApplication> & { company_name: string; job_title: string }
    ) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Unauthorized');
      if (payload.id) {
        const { data, error } = await supabase
          .from('job_applications')
          .update(payload)
          .eq('id', payload.id)
          .eq('user_id', user.id)
          .select()
          .single();
        if (error) throw error;
        return data as JobApplication;
      }
      const { data, error } = await supabase
        .from('job_applications')
        .insert({ ...payload, user_id: user.id })
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

export function useDeleteJobApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('job_applications')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['job-applications'] });
    },
  });
}
