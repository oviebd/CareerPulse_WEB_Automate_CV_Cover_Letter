'use client';

import { useEffect, useRef } from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/useAuthStore';
import { applyDevSubscriptionOverride } from '@/lib/dev-subscription';
import type { Profile } from '@/types';

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/cv',
  '/cover-letters',
  '/tracker',
  '/ai-tools',
  '/settings',
];

function mapProfile(row: Record<string, unknown> | null): Profile | null {
  if (!row || typeof row.id !== 'string') return null;
  return applyDevSubscriptionOverride(row as unknown as Profile);
}

function isLockContentionErrorMessage(message: string | undefined): boolean {
  if (!message) return false;
  return (
    message.includes('lock:sb-') ||
    message.includes('another request stole it') ||
    message.includes('NavigatorLockAcquireTimeoutError')
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);
  const setProfile = useAuthStore((s) => s.setProfile);
  const setInitialized = useAuthStore((s) => s.setInitialized);
  const wasAuthenticatedRef = useRef(false);
  const expiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const clearExpiryTimer = () => {
      if (!expiryTimerRef.current) return;
      clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    };

    const redirectToLoginIfProtected = () => {
      if (typeof window === 'undefined') return;
      const { pathname } = window.location;
      const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
      if (!isProtected) return;
      const returnTo = encodeURIComponent(pathname);
      window.location.href = `/login?returnTo=${returnTo}`;
    };

    const scheduleSessionExpiryCheck = (session: Session | null) => {
      clearExpiryTimer();
      const expiresAt = session?.expires_at;
      if (!expiresAt) return;

      const expiresAtMs = expiresAt * 1000;
      const msUntilCheck = Math.max(0, expiresAtMs - Date.now() + 1000);

      expiryTimerRef.current = setTimeout(async () => {
        try {
          const {
            data: { session: currentSession },
          } = await supabase.auth.getSession();
          if (!currentSession) {
            redirectToLoginIfProtected();
          }
        } catch {
          redirectToLoginIfProtected();
        }
      }, msUntilCheck);
    };

    async function syncFromUser(userId: string | undefined) {
      if (!userId) {
        setProfile(null);
        return;
      }
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (!error) {
          setProfile(mapProfile(data as Record<string, unknown> | null));
          return;
        }

        const isLockContention = isLockContentionErrorMessage(error.message);
        if (isLockContention && attempt < 3) {
          await sleep(80 * attempt);
          continue;
        }

        console.error('Failed to load profile:', error.message);
        setProfile(null);
        return;
      }
    }

    async function getSessionWithRetry(): Promise<Session | null> {
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          return session ?? null;
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          const isLockContention = isLockContentionErrorMessage(message);
          if (isLockContention && attempt < 3) {
            await sleep(80 * attempt);
            continue;
          }
          throw e;
        }
      }
      return null;
    }

    async function init() {
      try {
        const session = await getSessionWithRetry();
        const user = session?.user ?? null;
        setUser(user);
        scheduleSessionExpiryCheck(session ?? null);
        wasAuthenticatedRef.current = !!user;

        if (user) {
          await syncFromUser(user.id);
        } else {
          setProfile(null);
        }
      } catch (e) {
        console.error('Auth init unexpected error:', e);
        setUser(null);
        setProfile(null);
      } finally {
        setInitialized(true);
      }
    }

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      try {
        // init() already handles first-session bootstrap; skipping this avoids
        // duplicate session/profile reads that can contend across tabs.
        if (event === 'INITIAL_SESSION') return;

        const user = session?.user ?? null;
        setUser(user);
        scheduleSessionExpiryCheck(session);
        await syncFromUser(user?.id);

        if (event === 'SIGNED_IN') {
          wasAuthenticatedRef.current = true;
        }

        if (event === 'SIGNED_OUT' && wasAuthenticatedRef.current) {
          wasAuthenticatedRef.current = false;
          window.location.href = '/login';
        }
      } catch (e) {
        console.error('Auth state change error:', e);
      } finally {
        setInitialized(true);
      }
    });

    return () => {
      clearExpiryTimer();
      subscription.unsubscribe();
    };
  }, [setUser, setProfile, setInitialized]);

  return <>{children}</>;
}
