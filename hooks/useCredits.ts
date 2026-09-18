'use client';

import { useQuery, type QueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-fetch';

export const USER_CREDITS_QUERY_KEY = ['user-credits'] as const;

type CreditsResponse = { balance: number };

export function useCredits() {
  return useQuery({
    queryKey: USER_CREDITS_QUERY_KEY,
    queryFn: () => apiFetch<CreditsResponse>('/api/user/credits'),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}

export async function fetchCredits(queryClient: QueryClient): Promise<CreditsResponse> {
  return queryClient.fetchQuery({
    queryKey: USER_CREDITS_QUERY_KEY,
    queryFn: () => apiFetch<CreditsResponse>('/api/user/credits'),
    staleTime: 0,
  });
}

export async function waitForCreditBalance(
  queryClient: QueryClient,
  previous: number,
  minIncrease: number,
  attempts = 8
): Promise<boolean> {
  for (let i = 0; i < attempts; i += 1) {
    await queryClient.refetchQueries({ queryKey: USER_CREDITS_QUERY_KEY, type: 'all' });
    const data = queryClient.getQueryData<CreditsResponse>(USER_CREDITS_QUERY_KEY);
    if ((data?.balance ?? 0) >= previous + minIncrease) return true;
    if (i < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }
  return false;
}

export async function invalidateCreditQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: USER_CREDITS_QUERY_KEY }),
    queryClient.invalidateQueries({ queryKey: ['user-credit-transactions'] }),
    queryClient.invalidateQueries({ queryKey: ['ai-usage'] }),
  ]);
}
