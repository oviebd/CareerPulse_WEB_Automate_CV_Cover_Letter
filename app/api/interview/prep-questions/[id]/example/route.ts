import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { withInterviewAiRoute } from '@/lib/ai/with-user-route';
import { requireInterviewAccess, err } from '@/lib/interview/api-auth';
import { runGeneratePrepQuestionExample } from '@/lib/interview/orchestrator';
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
    const result = await withInterviewAiRoute(user.id, undefined, () =>
      runGeneratePrepQuestionExample(user.id, id)
    );
    return NextResponse.json(result);
  } catch (e) {
    console.error('interview/prep-questions/[id]/example POST', e);
    if (e instanceof Error && e.message === 'Prep question not found') {
      return err('Not found', 404);
    }
    const mapped = mapOrchestratorError(e);
    return interviewErrorResponse(mapped);
  }
}
