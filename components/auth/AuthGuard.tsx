'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';

const AUTH_TIMEOUT_MS = 5000;

/**
 * Client-side route guard for the dashboard group.
 *
 * Middleware handles server-side redirects, but Next.js Router Cache can serve
 * stale RSC payloads on soft navigations without hitting the server. This
 * component acts as a second layer: if the Zustand auth store reports no user
 * after initialization, it forces a hard redirect to /login so middleware runs
 * on a fresh request.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const pathname = usePathname();
  const redirectingRef = useRef(false);

  useEffect(() => {
    if (initialized && !user && !redirectingRef.current) {
      redirectingRef.current = true;
      const returnTo = encodeURIComponent(pathname);
      window.location.href = `/login?returnTo=${returnTo}`;
    }
  }, [initialized, user, pathname]);

  // Fallback: if auth never initializes (e.g. Supabase unreachable), redirect
  // to login after a timeout instead of showing a spinner forever.
  useEffect(() => {
    if (initialized) return;
    const timer = setTimeout(() => {
      if (!useAuthStore.getState().initialized && !redirectingRef.current) {
        redirectingRef.current = true;
        const returnTo = encodeURIComponent(pathname);
        window.location.href = `/login?returnTo=${returnTo}`;
      }
    }, AUTH_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [initialized, pathname]);

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
