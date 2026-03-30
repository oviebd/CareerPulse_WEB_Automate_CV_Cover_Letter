import { createBrowserClient } from '@supabase/ssr';
import { getSupabasePublicAnonKey } from '@/lib/supabase/public-env';

let singleton: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (singleton) return singleton;
  singleton = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    getSupabasePublicAnonKey()
  );
  return singleton;
}
