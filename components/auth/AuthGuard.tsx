'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { SIGNING_OUT_STORAGE_KEY } from '@/lib/sign-out-client';
import { useAuthStore } from '@/stores/useAuthStore';

/**
 * Client-side layout guard for the dashboard group.
 *
 * When the client cannot restore app user state, purge caches and send visitors
 * to the marketing home. Avoid linking to /login here: a stale session cookie
 * makes middleware bounce straight back to /dashboard.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!initialized || user) return;

    useAuthStore.getState().reset();
    queryClient.clear();
    try {
      sessionStorage.removeItem(SIGNING_OUT_STORAGE_KEY);
      sessionStorage.removeItem('cp_profile');
    } catch {
      // ignore
    }
    window.location.replace('/');
  }, [initialized, user, queryClient]);

  if (!initialized) {
    return (
      <div className="flex min-h-screen bg-[var(--color-background)]">
        {/* Sidebar skeleton */}
        <div className="hidden w-64 shrink-0 flex-col gap-3 border-r border-[var(--color-border)] bg-[var(--color-surface)] p-4 lg:flex">
          <div className="mb-4 h-8 w-36 animate-pulse rounded-lg bg-[var(--color-surface-2)]" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-[var(--color-surface-2)]" />
          ))}
        </div>
        {/* Mobile top bar */}
        <div className="fixed inset-x-0 top-0 flex h-14 items-center border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 lg:hidden">
          <div className="h-6 w-28 animate-pulse rounded-md bg-[var(--color-surface-2)]" />
        </div>
        {/* Content area */}
        <div className="flex-1 space-y-6 p-6 pt-20 lg:pt-6">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-[var(--color-surface-2)]" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)]">
        <p className="text-sm text-[var(--color-text-secondary)]">Redirecting…</p>
      </div>
    );
  }

  return <>{children}</>;
}
