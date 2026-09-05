import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { withInterviewAiRoute } from '@/lib/ai/with-user-route';
import { requireInterviewAccess, err } from '@/lib/interview/api-auth';
import { runAnalyzePipeline } from '@/lib/interview/orchestrator';
import { mapOrchestratorError } from '@/lib/interview/errors';
import { interviewErrorResponse } from '@/lib/interview/api-errors';

export const runtime = 'nodejs';
export const maxDuration = 240;

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return err('Unauthorized', 401);

    const denied = await requireInterviewAccess(user.id);
    if (denied) return denied;

    const body = (await request.json()) as {
      job_id?: string;
      cv_id?: string;
      extra_context?: string;
    };
    const jobId = body.job_id?.trim();
    if (!jobId) return err('job_id is required', 422);

    const result = await withInterviewAiRoute(user.id, jobId, () =>
      runAnalyzePipeline(user.id, jobId, {
        cvId: body.cv_id,
        extraContext: body.extra_context,
      })
    );
    return NextResponse.json(result);
  } catch (e) {
    console.error('interview/analyze', e);
    return interviewErrorResponse(mapOrchestratorError(e));
  }
}
