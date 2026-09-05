import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getJobsRepo } from '@/lib/db/repositories/jobs';
import type { JobStatus } from '@/types/database';
import { isJobStatus } from '@/lib/job-status';

type RouteContext = { params: Promise<{ id: string }> };

function err(msg: string, code: string | undefined, status: number) {
  return NextResponse.json({ error: msg, code }, { status });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    if (!user) return err('Unauthorized', 'UNAUTHORIZED', 401);

    const jid = id?.trim();
    if (!jid) return err('invalid_id', 'INVALID', 400);

    const body = (await request.json()) as { status?: unknown };
    const raw = body.status;
    if (typeof raw !== 'string' || !isJobStatus(raw.trim())) {
      return err('invalid_status', 'INVALID', 400);
    }
    const status = raw.trim() as JobStatus;

    let data: Record<string, unknown>;
    try {
      data = await getJobsRepo().update(user.id, jid, { status });
    } catch (e) {
      if (e instanceof Error && e.message === 'Job not found') {
        return err('Not found', 'NOT_FOUND', 404);
      }
      throw e;
    }

    return NextResponse.json({
      id: data.id as string,
      status: data.status as JobStatus,
      updated_at: data.updated_at as string,
    });
  } catch (e) {
    console.error('jobs status PATCH', e);
    return err('Failed to update status', 'UPDATE_FAILED', 500);
  }
}
