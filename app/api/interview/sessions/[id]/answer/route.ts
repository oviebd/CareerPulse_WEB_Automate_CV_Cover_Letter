import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { withInterviewAiRoute } from '@/lib/ai/with-user-route';
import { requireInterviewAccess, err } from '@/lib/interview/api-auth';
import { submitInterviewAnswer } from '@/lib/interview/orchestrator';
import { getInterviewRepo } from '@/lib/db/repositories/interview';

export const runtime = 'nodejs';
export const maxDuration = 120;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) return err('Unauthorized', 401);

    const denied = await requireInterviewAccess(user.id);
    if (denied) return denied;

    const { id } = await params;
    const body = (await request.json()) as {
      text_answer?: string;
      transcript?: string;
      audio_path?: string;
      duration_seconds?: number;
    };

    if (!body.text_answer?.trim() && !body.transcript?.trim()) {
      return err('Answer is required', 422);
    }

    const session = await getInterviewRepo().getSession(user.id, id);
    const profileId = session?.interview_profile_id as string | undefined;

    const result = await withInterviewAiRoute(user.id, profileId, () =>
      submitInterviewAnswer(user.id, id, body)
    );
    return NextResponse.json(result);
  } catch (e) {
    console.error('interview/sessions/answer', e);
    return err('Could not submit answer. Your progress is saved.', 500);
  }
}
