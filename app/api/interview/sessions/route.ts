import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { withInterviewAiRoute } from '@/lib/ai/with-user-route';
import { requireInterviewAccess, err } from '@/lib/interview/api-auth';
import { startInterviewSession } from '@/lib/interview/orchestrator';
import { handleInterviewApiError } from '@/lib/interview/api-errors';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return err('Unauthorized', 401);

    const denied = await requireInterviewAccess(user.id);
    if (denied) return denied;

    const body = (await request.json()) as {
      profile_id?: string;
      type?: string;
      mode?: string;
      difficulty?: string;
    };
    const profileId = body.profile_id?.trim();
    if (!profileId) return err('profile_id is required', 422);

    const result = await withInterviewAiRoute(user.id, profileId, () =>
      startInterviewSession(user.id, profileId, {
        type: body.type,
        mode: body.mode,
        difficulty: body.difficulty,
      })
    );
    return NextResponse.json(result);
  } catch (e) {
    console.error('interview/sessions POST', e);
    return handleInterviewApiError(e);
  }
}
