import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { safeRedirectPath } from '@/lib/redirect';
import { getSupabasePublicAnonKey } from '@/lib/supabase/public-env';

type RouteContext = { params: Promise<{ supabase: string[] }> };

/**
 * OAuth / magic-link / email confirmation callback (PKCE code exchange).
 * Configure Supabase redirect URL: `{NEXT_PUBLIC_APP_URL}/api/auth/callback`
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const nextRaw =
    searchParams.get('next') ??
    searchParams.get('returnTo') ??
    '/dashboard';
  const next = safeRedirectPath(nextRaw);

  const { supabase: routeSegments } = await context.params;
  const segments = routeSegments ?? [];
  const last = segments[segments.length - 1];
  if (last !== 'callback' && !code) {
    return NextResponse.redirect(new URL('/login', origin));
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/login?error=missing_code', origin)
    );
  }

  const redirectUrl = new URL(next, origin);
  const response = NextResponse.redirect(redirectUrl);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    getSupabasePublicAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error('exchangeCodeForSession:', error.message);
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(error.message)}`,
        origin
      )
    );
  }

  return response;
}
