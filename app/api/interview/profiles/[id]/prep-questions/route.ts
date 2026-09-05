import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getInterviewRepo } from '@/lib/db/repositories/interview';
import { withInterviewAiRoute } from '@/lib/ai/with-user-route';
import { requireInterviewAccess, err } from '@/lib/interview/api-auth';
import { runPrepQuestionBatch } from '@/lib/interview/orchestrator';
import { mapOrchestratorError } from '@/lib/interview/errors';
import { interviewErrorResponse } from '@/lib/interview/api-errors';

export const runtime = 'nodejs';
export const maxDuration = 120;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) return err('Unauthorized', 401);

    const { id } = await params;
    const repo = getInterviewRepo();
    const profile = await repo.getProfileById(user.id, id);
    if (!profile) return err('Not found', 404);

    const questions = await repo.listPrepQuestions(id);
    return NextResponse.json({ questions });
  } catch (e) {
    console.error('interview/profiles/[id]/prep-questions GET', e);
    return err('Failed to load prep questions', 500);
  }
}

export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) return err('Unauthorized', 401);

    const denied = await requireInterviewAccess(user.id);
    if (denied) return denied;

    const { id } = await params;
    const result = await withInterviewAiRoute(user.id, id, () =>
      runPrepQuestionBatch(user.id, id)
    );
    return NextResponse.json(result);
  } catch (e) {
    console.error('interview/profiles/[id]/prep-questions POST', e);
    const mapped = mapOrchestratorError(e);
    return interviewErrorResponse(mapped);
  }
}
