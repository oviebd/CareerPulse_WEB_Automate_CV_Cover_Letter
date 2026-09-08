'use client';

import { useQuery, type QueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-fetch';

export function useCredits() {
  return useQuery({
    queryKey: ['user-credits'],
    queryFn: () => apiFetch<{ balance: number }>('/api/user/credits'),
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function invalidateCreditQueries(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ['user-credits'] });
  void queryClient.invalidateQueries({ queryKey: ['user-credit-transactions'] });
  void queryClient.invalidateQueries({ queryKey: ['ai-usage'] });
}
