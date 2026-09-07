import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { withInterviewAiRoute } from '@/lib/ai/with-user-route';
import { requireInterviewAccess, err } from '@/lib/interview/api-auth';
import {
  startInterviewFromJob,
  startInterviewFromManualJob,
} from '@/lib/interview/orchestrator';
import { startInterviewFromTopic } from '@/lib/interview/topic-orchestrator';
import { handleInterviewApiError } from '@/lib/interview/api-errors';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return err('Unauthorized', 401);

    const denied = await requireInterviewAccess(user.id);
    if (denied) return denied;

    const body = (await request.json()) as Record<string, unknown>;
    const source = typeof body.source === 'string' ? body.source.trim() : 'job';

    if (source === 'topic') {
      const topic = typeof body.topic === 'string' ? body.topic.trim() : '';
      const currentLevel = typeof body.current_level === 'string' ? body.current_level.trim() : '';
      const goalLevel = typeof body.goal_level === 'string' ? body.goal_level.trim() : '';
      const purpose = typeof body.purpose === 'string' ? body.purpose.trim() : '';
      const notes = typeof body.notes === 'string' ? body.notes.trim() : undefined;

      const result = await withInterviewAiRoute(user.id, undefined, () =>
        startInterviewFromTopic(user.id, {
          topic,
          current_level: currentLevel,
          goal_level: goalLevel,
          purpose,
          notes,
        })
      );
      return NextResponse.json(result);
    }

    const jobId = typeof body.job_id === 'string' ? body.job_id.trim() : '';

    if (jobId) {
      const result = await withInterviewAiRoute(user.id, jobId, () =>
        startInterviewFromJob(user.id, {
          jobId,
          cvId: typeof body.cv_id === 'string' ? body.cv_id.trim() : undefined,
          extraContext: typeof body.extra_context === 'string' ? body.extra_context : undefined,
          interviewDate: typeof body.interview_date === 'string' ? body.interview_date : undefined,
          interviewStage: typeof body.interview_stage === 'string' ? body.interview_stage : undefined,
          jobDescription: typeof body.job_description === 'string' ? body.job_description : undefined,
        })
      );
      return NextResponse.json(result);
    }

    const jobTitle = typeof body.job_title === 'string' ? body.job_title.trim() : '';
    const companyName = typeof body.company_name === 'string' ? body.company_name.trim() : '';
    const jobDescription = typeof body.job_description === 'string' ? body.job_description.trim() : '';
    const cvId = typeof body.cv_id === 'string' ? body.cv_id.trim() : '';

    if (!jobTitle || !companyName) {
      return err('job_title and company_name are required', 422, 'JOB_CONTEXT_INSUFFICIENT');
    }
    if (!cvId) {
      return err('cv_id is required', 422, 'CV_NOT_FOUND');
    }

    const result = await withInterviewAiRoute(user.id, cvId, () =>
      startInterviewFromManualJob(user.id, {
        jobTitle,
        companyName,
        jobDescription,
        cvId,
        jobUrl: typeof body.job_url === 'string' ? body.job_url : undefined,
        interviewDate: typeof body.interview_date === 'string' ? body.interview_date : undefined,
        interviewStage: typeof body.interview_stage === 'string' ? body.interview_stage : undefined,
        extraContext: typeof body.extra_context === 'string' ? body.extra_context : undefined,
      })
    );
    return NextResponse.json(result);
  } catch (e) {
    console.error('interview/start', e);
    return handleInterviewApiError(e);
  }
}
