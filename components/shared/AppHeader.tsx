'use client';

import { useAuthStore } from '@/stores/useAuthStore';
import { useUIStore } from '@/stores/useUIStore';
import { SignOutButton } from '@/components/auth/SignOutButton';

export function AppHeader() {
  const profile = useAuthStore((s) => s.profile);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  return (
    <header className="flex h-14 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 lg:px-6">
      <button
        type="button"
        className="rounded-lg p-2 text-[var(--color-secondary)] hover:bg-slate-100 lg:hidden"
        onClick={toggleSidebar}
        aria-label="Open menu"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>
      <div className="hidden flex-1 lg:block" />
      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-[var(--color-muted)] sm:inline">
          {profile?.full_name || profile?.email || 'Account'}
        </span>
        {profile ? (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-700">
            {profile.subscription_tier}
          </span>
        ) : null}
        <SignOutButton />
      </div>
    </header>
  );
}
