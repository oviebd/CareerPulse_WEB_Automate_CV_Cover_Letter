/**
 * Public Supabase client key (anon JWT).
 * Dashboard may label it "anon" / "public" or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`.
 */
export function getSupabasePublicAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
    ''
  );
}
