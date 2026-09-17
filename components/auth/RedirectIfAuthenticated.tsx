'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { safeRedirectPath } from '@/lib/redirect';
import { useAuthStore } from '@/stores/useAuthStore';

/**
 * When app user state is loaded on login/register, send authenticated users to the app.
 */
export function RedirectIfAuthenticated({
  returnTo,
  fallbackPath = '/dashboard',
}: {
  returnTo?: string;
  fallbackPath?: string;
}) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);

  useEffect(() => {
    if (!initialized || !user) return;
    router.replace(safeRedirectPath(returnTo ?? fallbackPath));
  }, [initialized, user, returnTo, fallbackPath, router]);

  return null;
}
