import { NextResponse } from 'next/server';
import type { InterviewError } from '@/lib/interview/errors';

export function interviewErrorResponse(e: InterviewError) {
  const status =
    e.code === 'SCHEMA_NOT_MIGRATED'
      ? 503
      : e.code === 'CV_NOT_FOUND' ||
          e.code === 'JOB_CONTEXT_INSUFFICIENT' ||
          e.code === 'PROFILE_NOT_READY'
        ? 422
        : 500;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}
