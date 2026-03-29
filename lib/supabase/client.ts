import { createBrowserClient } from '@supabase/ssr';
import { getSupabasePublicAnonKey } from '@/lib/supabase/public-env';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    getSupabasePublicAnonKey()
  );
}
