import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getPaymentsRepo } from '@/lib/db/repositories/payments';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const data = await getPaymentsRepo().listByUser(user.id);
    return NextResponse.json(data ?? []);
  } catch (e) {
    console.error('payments GET', e);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}
