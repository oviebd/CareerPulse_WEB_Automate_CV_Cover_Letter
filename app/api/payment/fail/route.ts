import { NextResponse } from 'next/server';

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';

export async function POST() {
  return NextResponse.redirect(new URL('/settings/billing?payment=failed', appUrl));
}

export async function GET() {
  return NextResponse.redirect(new URL('/settings/billing?payment=failed', appUrl));
}
