'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

/**
 * For Supabase redirects configured to `/callback` instead of `/api/auth/callback`:
 * forwards `code` (and `next`) to the API route for PKCE exchange.
 */
export default function CallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      const qs = searchParams.toString();
      const origin =
        typeof window !== 'undefined'
          ? window.location.origin
          : (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(
              /\/$/,
              ''
            );
      window.location.replace(`${origin}/api/auth/callback?${qs}`);
      return;
    }
    router.replace('/login?error=missing_code');
  }, [router, searchParams]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center px-6 text-center">
      <p className="font-[family-name:var(--font-dm-sans)] text-lg font-medium text-[var(--color-secondary)]">
        Completing sign-in…
      </p>
      <p className="mt-2 text-sm text-[var(--color-muted)]">Please wait.</p>
    </div>
  );
}
