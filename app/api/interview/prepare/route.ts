import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { withInterviewAiRoute } from '@/lib/ai/with-user-route';
import { requireInterviewAccess, err } from '@/lib/interview/api-auth';
import { runPreparePipeline } from '@/lib/interview/orchestrator';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return err('Unauthorized', 401);

    const denied = await requireInterviewAccess(user.id);
    if (denied) return denied;

    const body = (await request.json()) as { profile_id?: string; force?: boolean };
    const profileId = body.profile_id?.trim();
    if (!profileId) return err('profile_id is required', 422);

    const result = await withInterviewAiRoute(user.id, profileId, () =>
      runPreparePipeline(user.id, profileId, { force: body.force === true })
    );
    return NextResponse.json(result);
  } catch (e) {
    console.error('interview/prepare', e);
    return err('Preparation generation failed.', 500);
  }
}
