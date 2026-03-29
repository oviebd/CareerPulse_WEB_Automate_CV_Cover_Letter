'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Profile } from '@/types';

function mapProfile(row: Record<string, unknown> | null): Profile | null {
  if (!row || typeof row.id !== 'string') return null;
  return row as unknown as Profile;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);
  const setProfile = useAuthStore((s) => s.setProfile);
  const setInitialized = useAuthStore((s) => s.setInitialized);

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
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Auth init:', error.message);
        setUser(null);
        setProfile(null);
        setInitialized(true);
        return;
      }
      setUser(user);
      await syncFromUser(user?.id);
      setInitialized(true);
    }

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null;
      setUser(user);
      await syncFromUser(user?.id);
      setInitialized(true);
    });

    return () => subscription.unsubscribe();
  }, [setUser, setProfile, setInitialized]);

  return <>{children}</>;
}
