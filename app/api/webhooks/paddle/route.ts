import { NextResponse } from 'next/server';
import { PaddleConfigError } from '@/lib/config/paddle';
import { BillingError } from '@/lib/paddle/errors';
import { paddleLog } from '@/lib/paddle/log';
import { handlePaddleWebhook } from '@/lib/paddle/webhook-service';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get('paddle-signature');
  try {
    await handlePaddleWebhook(rawBody, signature);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof BillingError && error.code === 'invalid_signature') {
      return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
    }
    if (error instanceof PaddleConfigError) {
      paddleLog('paddle_webhook_processed', { result: 'not_configured' });
      return NextResponse.json({ error: 'not_configured' }, { status: 500 });
    }
    console.error('paddle webhook', error);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
