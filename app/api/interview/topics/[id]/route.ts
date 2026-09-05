import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getInterviewRepo } from '@/lib/db/repositories/interview';
import { recalculateProfileProgress } from '@/lib/interview/orchestrator';
import { err } from '@/lib/interview/api-auth';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) return err('Unauthorized', 401);

    const { id } = await params;
    const body = (await request.json()) as { status?: string };
    const status = body.status?.trim();
    if (!status || !['pending', 'done'].includes(status)) {
      return err('status must be pending or done', 422);
    }

    const topic = await getInterviewRepo().updateTopic(user.id, id, { status });
    const profileId = await getInterviewRepo().getProfileIdForTopic(user.id, id);
    const readiness = profileId
      ? await recalculateProfileProgress(user.id, profileId)
      : null;
    return NextResponse.json({ topic, readiness });
  } catch (e) {
    console.error('interview/topics/[id] PATCH', e);
    if (e instanceof Error && e.message === 'Topic not found') {
      return err('Not found', 404);
    }
    return err('Failed to update topic', 500);
  }
}
