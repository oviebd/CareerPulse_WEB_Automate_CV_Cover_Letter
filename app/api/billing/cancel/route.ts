import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { BillingError, paddleUserMessage } from '@/lib/paddle/errors';
import { cancelUserSubscription } from '@/lib/paddle/subscription-service';

export async function POST() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: paddleUserMessage('unauthorized') }, { status: 401 });
    }
    const result = await cancelUserSubscription(user.id);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof BillingError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error('billing cancel', error);
    return NextResponse.json({ error: paddleUserMessage('paddle_unavailable') }, { status: 500 });
  }
}
