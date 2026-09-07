import { NextResponse } from 'next/server';
import type { InterviewError } from '@/lib/interview/errors';
import { mapOrchestratorError } from '@/lib/interview/errors';
import { handleAiRouteError } from '@/lib/credits/api-errors';

export function interviewErrorResponse(e: InterviewError) {
  const status =
    e.code === 'SCHEMA_NOT_MIGRATED'
      ? 503
      : e.code === 'CV_NOT_FOUND' ||
          e.code === 'JOB_CONTEXT_INSUFFICIENT' ||
          e.code === 'PROFILE_NOT_READY' ||
          e.code === 'TOPICS_REQUIRED' ||
          e.code === 'TOPIC_NOT_FOUND'
        ? 422
        : 500;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

export function handleInterviewApiError(e: unknown) {
  const creditErr = handleAiRouteError(e);
  if (creditErr) return creditErr;
  return interviewErrorResponse(mapOrchestratorError(e));
}
