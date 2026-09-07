import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Process liveness for Docker / CI smoke tests. Does not check dependencies. */
export async function GET() {
  return NextResponse.json({ status: 'ok' }, { status: 200 });
}
