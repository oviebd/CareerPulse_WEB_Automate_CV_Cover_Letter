'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useAuthStore } from '@/stores/useAuthStore';
import { applyDevSubscriptionOverride } from '@/lib/dev-subscription';
import type { Profile } from '@/types';

function mapProfile(row: Record<string, unknown> | null): Profile | null {
  if (!row || typeof row.id !== 'string') return null;
  return applyDevSubscriptionOverride(row as unknown as Profile);
}

/** Keeps Zustand auth state in sync with Auth.js session (including after client-side sign-in). */
function AuthJsSessionSync() {
  const { data: session, status } = useSession();
  const setUser = useAuthStore((s) => s.setUser);
  const setProfile = useAuthStore((s) => s.setProfile);
  const setInitialized = useAuthStore((s) => s.setInitialized);

  useEffect(() => {
    if (status === 'loading') {
      setInitialized(false);
      return;
    }

    let cancelled = false;
    setInitialized(false);

    async function sync() {
      if (!session?.user?.id) {
        if (!cancelled) {
          setUser(null);
          setProfile(null);
          setInitialized(true);
        }
        return;
      }

      try {
        const res = await fetch('/api/auth/session', { credentials: 'same-origin' });
        const json = (await res.json()) as {
          user: { id: string; email: string } | null;
          profile: Profile | null;
        };
        if (cancelled) return;
        if (json.user) {
          setUser(json.user);
          setProfile(
            json.profile ? mapProfile(json.profile as unknown as Record<string, unknown>) : null
          );
        } else {
          setUser({ id: session.user.id, email: session.user.email ?? '' });
          setProfile(null);
        }
      } catch {
        if (!cancelled) {
          setUser({ id: session.user.id, email: session.user.email ?? '' });
          setProfile(null);
        }
      } finally {
        if (!cancelled) setInitialized(true);
      }
    }

    void sync();
    return () => {
      cancelled = true;
    };
  }, [session, status, setUser, setProfile, setInitialized]);

  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthJsSessionSync />
      {children}
    </>
  );
}
