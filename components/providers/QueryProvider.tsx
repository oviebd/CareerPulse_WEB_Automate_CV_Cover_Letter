'use client';

import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { handleQueryAuthError } from '@/lib/auth-fetch';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error) => {
            handleQueryAuthError(error);
          },
        }),
        mutationCache: new MutationCache({
          onError: (error) => {
            handleQueryAuthError(error);
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              // Don't retry on auth errors — redirect to login instead
              if (
                typeof error === 'object' &&
                error !== null &&
                (((error as unknown as Record<string, unknown>).status === 401) ||
                  ((error as unknown as Record<string, unknown>).code === 401))
              ) {
                return false;
              }
              return failureCount < 1;
            },
            retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
          },
        },
      })
  );
  return (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}
