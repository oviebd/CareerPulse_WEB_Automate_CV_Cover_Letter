'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/useAuthStore';
import { cn } from '@/lib/utils';

export function SignOutButton({ className }: { className?: string }) {
  const queryClient = useQueryClient();
  const reset = useAuthStore((s) => s.reset);
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    const supabase = createClient();

    try {
      await fetch('/api/auth/signout', {
        method: 'POST',
        credentials: 'same-origin',
      });
    } catch {
      // Non-critical — client signOut below also clears cookies
    }

    await supabase.auth.signOut();

    reset();
    queryClient.clear();

    window.location.href = '/login';
  }

  return (
    <button
      type="button"
      onClick={() => void signOut()}
      disabled={loading}
      className={cn(
        'rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-medium text-[var(--color-secondary)] hover:bg-slate-50 disabled:opacity-60',
        className
      )}
    >
      {loading ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
