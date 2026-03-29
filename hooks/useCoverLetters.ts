'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { CoverLetter } from '@/types';

export function useCoverLettersList() {
  return useQuery({
    queryKey: ['cover-letters'],
    queryFn: async (): Promise<CoverLetter[]> => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from('cover_letters')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as CoverLetter[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCoverLetter(id: string | undefined) {
  return useQuery({
    queryKey: ['cover-letter', id],
    queryFn: async (): Promise<CoverLetter | null> => {
      if (!id) return null;
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from('cover_letters')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as CoverLetter | null;
    },
    enabled: Boolean(id),
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
