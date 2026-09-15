import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { BillingError, paddleUserMessage } from '@/lib/paddle/errors';
import { PaddleConfigError } from '@/lib/config/paddle';
import { createCheckoutPayload } from '@/lib/paddle/subscription-service';

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: paddleUserMessage('unauthorized') }, { status: 401 });
    }
    const body = (await request.json()) as { plan?: string; billingInterval?: string };
    const payload = await createCheckoutPayload(
      user,
      body.plan ?? '',
      body.billingInterval ?? ''
    );
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof BillingError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    if (error instanceof PaddleConfigError) {
      return NextResponse.json({ error: paddleUserMessage('not_configured') }, { status: 503 });
    }
    console.error('billing checkout', error);
    return NextResponse.json({ error: paddleUserMessage('paddle_unavailable') }, { status: 500 });
  }
}
