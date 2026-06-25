'use client';

import { useState } from 'react';
import { signOutAndGoHome } from '@/lib/sign-out-client';
import { cn } from '@/lib/utils';

export function SignOutButton({ className }: { className?: string }) {
  const [loading, setLoading] = useState(false);

  function signOut() {
    setLoading(true);
    signOutAndGoHome();
  }

  return (
    <button
      type="button"
      onClick={() => void signOut()}
      disabled={loading}
      className={cn(
        'rounded-btn border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-hover-surface)] disabled:opacity-60',
        className
      )}
    >
      {loading ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
