'use client';

import { useEffect, useRef } from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/useAuthStore';
import { applyDevSubscriptionOverride } from '@/lib/dev-subscription';
import type { Profile } from '@/types';

function mapProfile(row: Record<string, unknown> | null): Profile | null {
  if (!row || typeof row.id !== 'string') return null;
  return applyDevSubscriptionOverride(row as unknown as Profile);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);
  const setProfile = useAuthStore((s) => s.setProfile);
  const setInitialized = useAuthStore((s) => s.setInitialized);
  const wasAuthenticatedRef = useRef(false);

  useEffect(() => {
    const supabase = createClient();

    async function syncFromUser(userId: string | undefined) {
      if (!userId) {
        setProfile(null);
        return;
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (error) {
        console.error('Failed to load profile:', error.message);
        setProfile(null);
        return;
      }
      setProfile(mapProfile(data as Record<string, unknown> | null));
    }

    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user ?? null;
        setUser(user);
        wasAuthenticatedRef.current = !!user;

        if (user) {
          const [, profileResult] = await Promise.all([
            supabase.auth.getUser(),
            supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .maybeSingle(),
          ]);
          setProfile(
            mapProfile(profileResult.data as Record<string, unknown> | null)
          );
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
        const user = session?.user ?? null;
        setUser(user);
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

    return () => subscription.unsubscribe();
  }, [setUser, setProfile, setInitialized]);

  return <>{children}</>;
}
