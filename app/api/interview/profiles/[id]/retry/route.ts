import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { withInterviewAiRoute } from '@/lib/ai/with-user-route';
import { requireInterviewAccess, err } from '@/lib/interview/api-auth';
import { getInterviewRepo } from '@/lib/db/repositories/interview';
import { retryJobInterview } from '@/lib/interview/orchestrator';
import { retryTopicInterview } from '@/lib/interview/topic-orchestrator';
import { mapOrchestratorError } from '@/lib/interview/errors';
import { interviewErrorResponse } from '@/lib/interview/api-errors';

export const runtime = 'nodejs';
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) return err('Unauthorized', 401);

    const denied = await requireInterviewAccess(user.id);
    if (denied) return denied;

    const { id } = await params;
    const repo = getInterviewRepo();
    const profile = await repo.getProfileById(user.id, id);
    if (!profile) return err('Not found', 404);

    if (profile.prep_source === 'topic') {
      const result = await withInterviewAiRoute(user.id, id, () =>
        retryTopicInterview(user.id, id)
      );
      return NextResponse.json(result);
    }

    if (!profile.job_id) {
      return err('Cannot retry this profile', 422, 'PROFILE_NOT_FOUND');
    }

    const result = await withInterviewAiRoute(user.id, profile.job_id as string, () =>
      retryJobInterview(user.id, id)
    );
    return NextResponse.json(result);
  } catch (e) {
    console.error('interview/profiles/[id]/retry', e);
    return interviewErrorResponse(mapOrchestratorError(e));
  }
}
