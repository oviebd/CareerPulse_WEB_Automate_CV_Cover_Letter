'use client';

import { useEffect, useRef } from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/useAuthStore';
import { applyDevSubscriptionOverride } from '@/lib/dev-subscription';
import { isProtectedAppPath } from '@/lib/guest-cv-paths';
import type { Profile } from '@/types';

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

/**
 * Session bootstrap: `initialized` in the auth store stays false until getSession/getUser
 * finishes (equivalent to an isInitializing guard). Do not client-redirect to /login from
 * init; middleware owns that. AuthGuard shows a spinner until initialized.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);
  const setProfile = useAuthStore((s) => s.setProfile);
  const setInitialized = useAuthStore((s) => s.setInitialized);
  const wasAuthenticatedRef = useRef(false);
  const expiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const redirectingRef = useRef(false);
  /** Stops onAuthStateChange from clearing the user while init() is still resolving (new tabs). */
  const initSessionCompleteRef = useRef(false);

  useEffect(() => {
    initSessionCompleteRef.current = false;
    const supabase = createClient();
    const clearExpiryTimer = () => {
      if (!expiryTimerRef.current) return;
      clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    };

    /**
     * Client redirect to /login is only for mid-session sign-out / session invalidation
     * (clearAndRedirect, SIGNED_OUT). init() does not redirect: middleware already gate-keeps
     * protected and auth routes.
     */
    const redirectToLoginIfProtected = () => {
      if (typeof window === 'undefined') return;
      if (redirectingRef.current) return;
      const { pathname } = window.location;
      if (!isProtectedAppPath(pathname)) return;
      redirectingRef.current = true;
      const returnTo = encodeURIComponent(pathname);
      window.location.href = `/login?returnTo=${returnTo}`;
    };

    /**
     * Clear all auth state and redirect to login.
     * Used when we detect a truly invalid / expired session.
     */
    const clearAndRedirect = async () => {
      setUser(null);
      setProfile(null);
      clearExpiryTimer();
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch {
        // Best-effort — cookies may already be gone
      }
      redirectToLoginIfProtected();
    };

    const scheduleSessionExpiryCheck = (session: Session | null) => {
      clearExpiryTimer();
      const expiresAt = session?.expires_at;
      if (!expiresAt) return;

      const expiresAtMs = expiresAt * 1000;
      const msUntilCheck = Math.max(0, expiresAtMs - Date.now() + 1000);

      expiryTimerRef.current = setTimeout(async () => {
        try {
          // Validate against the server, not just local storage
          const {
            data: { user },
            error,
          } = await supabase.auth.getUser();
          if (error || !user) {
            await clearAndRedirect();
          }
        } catch {
          await clearAndRedirect();
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

    /**
     * Get session with retry (handles navigator lock contention).
     * Since middleware.ts handles strict validation and token refresh on page load,
     * getSession() is safe to use here. It's much faster than getUser() and
     * significantly reduces lock contention across multiple tabs.
     */
    async function getSessionWithRetry(): Promise<Session | null> {
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          return session ?? null;
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          if (isLockContentionErrorMessage(message) && attempt < 3) {
            await sleep(80 * attempt);
            continue;
          }
          throw e;
        }
      }
      return null;
    }

    async function getUserWithRetry() {
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          const {
            data: { user },
            error,
          } = await supabase.auth.getUser();
          if (error) throw error;
          return user ?? null;
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          if (isLockContentionErrorMessage(message) && attempt < 3) {
            await sleep(80 * attempt);
            continue;
          }
          console.error('Auth init getUser:', e);
          return null;
        }
      }
      return null;
    }

    async function init() {
      let userResolvedWithoutSessionObject = false;
      try {
        // Step 1: Read the session from cookies.
        // The server (middleware.ts) has already validated and potentially refreshed
        // this session before the page even loaded.
        let session = await getSessionWithRetry();

        if (!session) {
          // getSession() can be empty under lock contention while cookies are still valid
          // (e.g. new tab), getUser() validates with the server.
          const userFromUser = await getUserWithRetry();
          if (userFromUser) {
            const {
              data: { session: s2 },
            } = await supabase.auth.getSession();
            session = s2 ?? null;
            if (!session) {
              setUser(userFromUser);
              wasAuthenticatedRef.current = true;
              scheduleSessionExpiryCheck(null);
              await syncFromUser(userFromUser.id);
              userResolvedWithoutSessionObject = true;
            }
          }
        }

        if (session?.user) {
          setUser(session.user);
          wasAuthenticatedRef.current = true;
          scheduleSessionExpiryCheck(session);
          await syncFromUser(session.user.id);
        } else if (!userResolvedWithoutSessionObject) {
          setUser(null);
          setProfile(null);
          wasAuthenticatedRef.current = false;
          try {
            await supabase.auth.signOut({ scope: 'local' });
          } catch {
            // Best-effort cleanup
          }
        }
      } catch (e) {
        console.error('Auth init unexpected error:', e);
        setUser(null);
        setProfile(null);
      } finally {
        initSessionCompleteRef.current = true;
        setInitialized(true);
      }
    }

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      try {
        if (!initSessionCompleteRef.current) {
          return;
        }
        if (event === 'INITIAL_SESSION') {
          return;
        }

        if (event === 'TOKEN_REFRESHED' && !session) {
          await clearAndRedirect();
          return;
        }

        const nextUser = session?.user ?? null;

        if (nextUser === null) {
          if (event === 'SIGNED_OUT') {
            setUser(null);
            scheduleSessionExpiryCheck(null);
            await syncFromUser(undefined);
            const hadSession = wasAuthenticatedRef.current;
            wasAuthenticatedRef.current = false;
            if (hadSession) {
              window.location.href = '/login';
            }
          }
          return;
        }

        setUser(nextUser);
        scheduleSessionExpiryCheck(session);
        await syncFromUser(nextUser.id);

        if (event === 'SIGNED_IN') {
          wasAuthenticatedRef.current = true;
        }
      } catch (e) {
        console.error('Auth state change error:', e);
      } finally {
        setInitialized(true);
      }
    });

    return () => {
      initSessionCompleteRef.current = false;
      clearExpiryTimer();
      subscription.unsubscribe();
    };
  }, [setUser, setProfile, setInitialized]);

  return <>{children}</>;
}
