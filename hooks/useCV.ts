'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { CVProfile } from '@/types';

export function useCVProfile() {
  return useQuery({
    queryKey: ['cv-profile'],
    queryFn: async (): Promise<CVProfile | null> => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from('cv_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as CVProfile | null;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateCVProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Unauthorized');
      const { data, error } = await supabase
        .from('cv_profiles')
        .update(patch)
        .eq('user_id', user.id)
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
