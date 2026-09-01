import { NextResponse } from 'next/server';
import { signOut } from '@/lib/auth';
import type { NextRequest } from 'next/server';

function safeRedirectPath(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/';
  return value;
}

export async function POST() {
  await signOut({ redirect: false });
  return NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest) {
  const redirectPath = safeRedirectPath(request.nextUrl.searchParams.get('redirect'));
  await signOut({ redirect: false });
  return NextResponse.redirect(new URL(redirectPath, request.url));
}
