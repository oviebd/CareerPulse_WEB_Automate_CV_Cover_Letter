import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSupabasePublicAnonKey } from '@/lib/supabase/public-env';

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/cv',
  '/cover-letters',
  '/tracker',
  '/ai-tools',
  '/settings',
];
const AUTH_ROUTES = ['/login', '/register'];

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthRoute = AUTH_ROUTES.some((p) => pathname.startsWith(p));

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('returnTo', pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Exclude all Next internals (/_next/*), not only /_next/static and /_next/image.
     * A too-narrow exclusion can let middleware run on dev assets (e.g. webpack-hmr)
     * and cause flaky 404s for CSS/JS. Also skip the payment webhook and favicon.
     */
    '/((?!_next/|api/payment/ipn|favicon\\.ico).*)',
  ],
};
