import { NextResponse, type NextRequest } from 'next/server';

/**
 * Legacy OAuth callback path. Auth.js handles Google at `/api/auth/callback/google`.
 */
const appUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';

export async function GET(request: NextRequest) {
  const next = request.nextUrl.searchParams.get('next') ?? '/dashboard';
  const path = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
  return NextResponse.redirect(new URL(path, appUrl));
}
