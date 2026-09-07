'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-fetch';

export function useCredits() {
  return useQuery({
    queryKey: ['user-credits'],
    queryFn: () => apiFetch<{ balance: number }>('/api/user/credits'),
    staleTime: 30_000,
  });
}
