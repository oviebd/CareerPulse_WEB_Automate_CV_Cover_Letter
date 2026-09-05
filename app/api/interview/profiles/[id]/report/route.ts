import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getInterviewRepo } from '@/lib/db/repositories/interview';
import { err } from '@/lib/interview/api-auth';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) return err('Unauthorized', 401);

    const { id } = await params;
    const profile = await getInterviewRepo().getProfileById(user.id, id);
    if (!profile) return err('Not found', 404);

    const sessions = await getInterviewRepo().listSessions(id);
    const completed = sessions.find((s) => s.status === 'completed' && s.evaluation_json);
    return NextResponse.json({
      report: completed?.evaluation_json ?? null,
      session_id: completed?.id ?? null,
    });
  } catch (e) {
    console.error('interview/report', e);
    return err('Failed to load report', 500);
  }
}
