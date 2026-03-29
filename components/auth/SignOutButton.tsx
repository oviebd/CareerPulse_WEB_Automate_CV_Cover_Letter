'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/useAuthStore';

export function SignOutButton() {
  const queryClient = useQueryClient();
  const reset = useAuthStore((s) => s.reset);
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    const supabase = createClient();

    // 1) Server route must run while session cookies are still present so it can clear them on the response.
    try {
      const res = await fetch('/api/auth/signout', {
        method: 'POST',
        credentials: 'same-origin',
      });
      if (!res.ok) {
        console.error('[sign out] server route failed:', res.status, await res.text());
      }
    } catch (e) {
      console.error('[sign out] server route:', e);
    }

    // 2) `scope: 'local'` — avoids default `global` which can fail the `/logout` request and skip removing the session.
    const { error: clientErr } = await supabase.auth.signOut({ scope: 'local' });
    if (clientErr) {
      console.error('[sign out] client signOut:', clientErr.message);
    }

    reset();
    queryClient.clear();

    // Hard navigation resets the Next.js tree, middleware, and @supabase/ssr singleton client.
    window.location.assign('/login');
  }

  return (
    <button
      type="button"
      onClick={() => void signOut()}
      disabled={loading}
      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-medium text-[var(--color-secondary)] hover:bg-slate-50 disabled:opacity-60"
    >
      {loading ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
