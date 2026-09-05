import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getProfileDashboard } from '@/lib/interview/orchestrator';
import { err } from '@/lib/interview/api-auth';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) return err('Unauthorized', 401);

    const { id } = await params;
    const data = await getProfileDashboard(user.id, id);
    return NextResponse.json({
      mastery: data.mastery,
      sessions: data.sessions,
      readiness: data.readiness,
    });
  } catch (e) {
    console.error('interview/progress', e);
    return err('Failed to load progress', 500);
  }
}
