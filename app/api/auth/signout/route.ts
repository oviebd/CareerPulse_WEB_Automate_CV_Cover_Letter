import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabasePublicAnonKey } from '@/lib/supabase/public-env';

/**
 * Clears Supabase auth cookies on the server so middleware and RSC see a logged-out user.
 * Pair with client `signOut({ scope: 'local' })` + full page navigation.
 */
export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    getSupabasePublicAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) {
    console.error('[api/auth/signout]', error.message);
  }

  return response;
}
