'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Job, JobStatus } from '@/types/database';

export function useJobApplications() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['job-applications', userId],
    queryFn: async (): Promise<Job[]> => {
      if (!userId) return [];
      const supabase = createClient();
      const { data: links, error: linkErr } = await supabase
        .from('applied_jobs')
        .select('job_id')
        .eq('user_id', userId);
      if (linkErr) throw linkErr;
      const ids = (links ?? [])
        .map((r: { job_id: string }) => r.job_id)
        .filter(Boolean);
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('user_id', userId)
        .in('id', ids)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Job[];
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
      status: JobStatus;
    }) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Unauthorized');
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('jobs')
        .update({ status, updated_at: now })
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
      const { error: ajErr } = await supabase
        .from('applied_jobs')
        .update({ status, updated_at: now })
        .eq('job_id', id)
        .eq('user_id', user.id);
      if (ajErr) throw ajErr;
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
    mutationFn: async (payload: Partial<Job> & { company_name: string; job_title: string }) => {
      if (!userId) throw new Error('Unauthorized');
      const supabase = createClient();
      const now = new Date().toISOString();
      if (payload.id) {
        const { data, error } = await supabase
          .from('jobs')
          .update(payload)
          .eq('id', payload.id)
          .eq('user_id', userId)
          .select()
          .single();
        if (error) throw error;
        if (payload.status != null) {
          const { error: ajErr } = await supabase
            .from('applied_jobs')
            .update({ status: payload.status, updated_at: now })
            .eq('job_id', payload.id)
            .eq('user_id', userId);
          if (ajErr) throw ajErr;
        }
        return data as Job;
      }
      const { data, error } = await supabase
        .from('jobs')
        .insert({ ...payload, user_id: userId, keywords: payload.keywords ?? [] })
        .select()
        .single();
      if (error) throw error;
      const job = data as Job;
      const { error: ajErr } = await supabase.from('applied_jobs').insert({
        user_id: userId,
        job_id: job.id,
        status: job.status,
      });
      if (ajErr) throw ajErr;
      return job;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['job-applications'] });
    },
  });
}
