import { auth } from '@/lib/auth';
import { isProtectedAppPath } from '@/lib/guest-cv-paths';
import { publicAppUrl } from '@/lib/redirect';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_ROUTES = ['/login', '/register'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = isProtectedAppPath(pathname);
  const isAuthRoute = AUTH_ROUTES.some((p) => pathname.startsWith(p));

  const session = await auth();
  const user = session?.user;

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('returnTo', `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }
  if (isAuthRoute && user) {
    return NextResponse.redirect(publicAppUrl(request, '/dashboard'));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/|api/|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
