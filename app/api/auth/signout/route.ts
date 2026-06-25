import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabasePublicAnonKey } from '@/lib/supabase/public-env';

function isAuthSessionMissingError(error: { message?: string; name?: string } | null): boolean {
  if (!error) return false;
  return error.name === 'AuthSessionMissingError' || error.message === 'Auth session missing!';
}

function createSupabaseForSignOut(request: NextRequest, response: NextResponse) {
  return createServerClient(
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
}

async function signOutOnResponse(request: NextRequest, response: NextResponse) {
  const supabase = createSupabaseForSignOut(request, response);
  const { error } = await supabase.auth.signOut();
  if (error && !isAuthSessionMissingError(error)) {
    console.error('[api/auth/signout]', error.message);
  }
}

function safeRedirectPath(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/';
  }
  return value;
}

/** Clears Supabase auth cookies on the server so middleware and RSC see a logged-out user. */
export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  await signOutOnResponse(request, response);
  return response;
}

/** Full-page logout: clear cookies, then redirect (used by the profile menu). */
export async function GET(request: NextRequest) {
  const redirectPath = safeRedirectPath(request.nextUrl.searchParams.get('redirect'));
  const response = NextResponse.redirect(new URL(redirectPath, request.url));
  await signOutOnResponse(request, response);
  return response;
}
