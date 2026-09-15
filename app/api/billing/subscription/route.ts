import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { paddleUserMessage } from '@/lib/paddle/errors';
import { getBillingSubscription } from '@/lib/paddle/subscription-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: paddleUserMessage('unauthorized') }, { status: 401 });
    }
    const data = await getBillingSubscription(user.id);
    return NextResponse.json(data);
  } catch (error) {
    console.error('billing subscription GET', error);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
