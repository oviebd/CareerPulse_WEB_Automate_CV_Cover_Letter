import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { withInterviewAiRoute } from '@/lib/ai/with-user-route';
import { requireInterviewAccess, err } from '@/lib/interview/api-auth';
import { runAnalyzePipeline } from '@/lib/interview/orchestrator';
import { handleInterviewApiError } from '@/lib/interview/api-errors';

export const runtime = 'nodejs';
export const maxDuration = 240;

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return err('Unauthorized', 401);

    const denied = await requireInterviewAccess(user.id);
    if (denied) return denied;

    const body = (await request.json()) as {
      profile_id?: string;
      answers?: Record<string, string>;
    };
    const profileId = body.profile_id?.trim();
    if (!profileId) return err('profile_id is required', 422);

    const { getInterviewRepo } = await import('@/lib/db/repositories/interview');
    const profile = await getInterviewRepo().getProfileById(user.id, profileId);
    if (!profile) return err('Not found', 404);

    const result = await withInterviewAiRoute(user.id, profileId, () =>
      runAnalyzePipeline(user.id, profile.job_id as string, {
        cvId: profile.cv_id as string | undefined,
        extraContext: profile.extra_context as string | undefined,
        clarificationAnswers: body.answers,
      })
    );
    return NextResponse.json(result);
  } catch (e) {
    console.error('interview/clarify', e);
    return handleInterviewApiError(e);
  }
}
