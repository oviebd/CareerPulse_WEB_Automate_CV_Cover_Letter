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
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
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
