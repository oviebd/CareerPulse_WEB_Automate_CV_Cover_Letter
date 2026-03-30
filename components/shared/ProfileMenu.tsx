'use client';

import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { CreditCard, LogOut, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSubscription } from '@/hooks/useSubscription';

function initials(name: string | null | undefined, email: string | undefined) {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
  }
  return (email?.[0] ?? 'U').toUpperCase();
}

export function ProfileMenu() {
  const pathname = usePathname();
  const profile = useAuthStore((s) => s.profile);
  const reset = useAuthStore((s) => s.reset);
  const queryClient = useQueryClient();
  const { tier } = useSubscription();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const signOut = useCallback(async () => {
    setSigningOut(true);
    const supabase = createClient();
    try {
      await fetch('/api/auth/signout', { method: 'POST', credentials: 'same-origin' });
    } catch {
      // ignore
    }
    await supabase.auth.signOut();
    reset();
    queryClient.clear();
    window.location.href = '/login';
  }, [queryClient, reset]);

  const displayName = profile?.full_name?.trim() || 'Account';
  const email = profile?.email ?? '';
  const planLabel = tier.charAt(0).toUpperCase() + tier.slice(1);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/30 bg-white/15 text-sm font-semibold text-white transition hover:border-white/50 hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
          open && 'ring-2 ring-white/40'
        )}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
      >
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-xs uppercase">{initials(profile?.full_name, email)}</span>
        )}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            role="menu"
            className="absolute right-0 top-[calc(100%+8px)] z-[60] w-[min(100vw-24px,280px)] rounded-xl border border-slate-200 bg-white py-2 text-slate-900 shadow-xl"
          >
            <div className="border-b border-slate-100 px-4 pb-3 pt-1">
              <p className="truncate font-semibold text-slate-900">{displayName}</p>
              {email ? (
                <p className="truncate text-xs text-slate-500">{email}</p>
              ) : null}
            </div>

            <div className="border-b border-slate-100 px-2 py-2">
              <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Plans
              </p>
              <div className="rounded-lg px-2 py-2">
                <p className="text-sm font-medium text-slate-900">Current plan</p>
                <p className="text-xs capitalize text-slate-500">{planLabel}</p>
              </div>
              <Link
                href="/settings/billing"
                role="menuitem"
                className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
                onClick={() => setOpen(false)}
              >
                <CreditCard className="h-4 w-4 shrink-0 text-slate-500" />
                Billing &amp; plans
              </Link>
            </div>

            <div className="px-2 py-1">
              <Link
                href="/settings"
                role="menuitem"
                className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
                onClick={() => setOpen(false)}
              >
                <Settings className="h-4 w-4 shrink-0 text-slate-500" />
                Settings
              </Link>
              <button
                type="button"
                role="menuitem"
                disabled={signingOut}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
                onClick={() => void signOut()}
              >
                <LogOut className="h-4 w-4 shrink-0 text-slate-500" />
                {signingOut ? 'Signing out…' : 'Log out'}
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
