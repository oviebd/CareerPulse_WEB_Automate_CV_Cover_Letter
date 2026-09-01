import { NextResponse } from 'next/server';
import { registerWithCredentials } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      fullName?: string;
    };
    const result = await registerWithCredentials({
      email: body.email ?? '',
      password: body.password ?? '',
      fullName: body.fullName,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }
    return NextResponse.json({ ok: true, userId: result.userId });
  } catch (e) {
    console.error('register POST', e);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
