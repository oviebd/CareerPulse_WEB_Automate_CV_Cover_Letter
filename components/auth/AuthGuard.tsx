'use client';

import Link from 'next/link';
import { useAuthStore } from '@/stores/useAuthStore';

/**
 * Client-side layout guard for the dashboard group.
 *
 * Server middleware enforces the session. No automatic hard redirect here:
 * doing `window.location` to /login while cookies are valid caused middleware
 * to send users to /dashboard and felt like an endless “reload” when auth
 * events briefly nulled the client user. Use a static fallback if needed.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);

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
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[var(--color-background)] px-4 text-center text-sm text-[var(--color-text-secondary)]">
        <p>We couldn&apos;t restore your session in this view.</p>
        <Link
          href="/login"
          className="text-sm font-semibold text-[var(--color-primary)] hover:underline"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
