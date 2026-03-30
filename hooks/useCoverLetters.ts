'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/useAuthStore';
import type { CoverLetter } from '@/types';

export function useCoverLettersList() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['cover-letters', userId],
    queryFn: async (): Promise<CoverLetter[]> => {
      if (!userId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from('cover_letters')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as CoverLetter[];
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
      const supabase = createClient();
      const { data, error } = await supabase
        .from('cover_letters')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data as CoverLetter | null;
    },
    enabled: Boolean(id) && !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useDeleteCoverLetter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('cover_letters')
        .delete()
        .eq('id', id);
      if (error) throw error;
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
      const supabase = createClient();
      const { error } = await supabase
        .from('cover_letters')
        .update({ is_favourited })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['cover-letters'] });
    },
  });
}
