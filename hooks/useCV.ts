'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/useAuthStore';
import type { CVProfile } from '@/types';

export function useCVProfile() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['cv-profile', userId],
    queryFn: async (): Promise<CVProfile | null> => {
      if (!userId) return null;
      const supabase = createClient();
      const { data, error } = await supabase
        .from('cv_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data as CVProfile | null;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: 'always',
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
