'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Job, JobStatus } from '@/types/database';
import { stripUndefined } from '@/lib/queries/strip-undefined';

export function useJobApplications() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['job-applications', userId],
    queryFn: async (): Promise<Job[]> => {
      if (!userId) return [];
      const res = await fetch('/api/jobs');
      if (!res.ok) throw new Error('failed');
      return res.json() as Promise<Job[]>;
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}

export function useTrackedJobsCount() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['tracked-jobs-count', userId],
    queryFn: async (): Promise<number> => {
      if (!userId) return 0;
      const res = await fetch('/api/jobs');
      if (!res.ok) return 0;
      const data = (await res.json()) as Job[];
      return data.length;
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}

export function useUpdateApplicationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: JobStatus }) => {
      const res = await fetch(`/api/jobs/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('update_failed');
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['job-applications'] });
      void qc.invalidateQueries({ queryKey: ['tracked-jobs-count'] });
    },
  });
}

export function useUpsertJobApplication() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  return useMutation({
    mutationFn: async (
      payload: Partial<Job> & { company_name: string; job_title: string }
    ) => {
      if (!userId) throw new Error('Unauthorized');
      if (payload.id) {
        const { id, ...rest } = payload;
        const patch = stripUndefined(rest as Record<string, unknown>);
        const res = await fetch(`/api/jobs/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
        if (!res.ok) throw new Error('update_failed');
        return res.json() as Promise<Job>;
      }
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: payload.company_name,
          job_title: payload.job_title,
          job_url: payload.job_url ?? undefined,
          keywords: payload.keywords ?? [],
          status: payload.status ?? 'apply_later',
        }),
      });
      if (!res.ok) throw new Error('create_failed');
      return res.json() as Promise<Job>;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['job-applications'] });
      void qc.invalidateQueries({ queryKey: ['tracked-jobs-count'] });
    },
  });
}
