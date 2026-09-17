import { auth } from '@/lib/auth';
import { isProtectedAppPath } from '@/lib/guest-cv-paths';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const NO_STORE = 'private, no-store';

function withNoStore(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', NO_STORE);
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = isProtectedAppPath(pathname);
  const isAuthRoute =
    pathname.startsWith('/login') || pathname.startsWith('/register');
  const shouldNoStore = isProtected || isAuthRoute;

  const session = await auth();
  const user = session?.user;

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('returnTo', `${pathname}${request.nextUrl.search}`);
    return withNoStore(NextResponse.redirect(url));
  }
  if (shouldNoStore) {
    return withNoStore(NextResponse.next());
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/|api/|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
