import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import type { Job } from '@/types/database';
import { stripUndefined } from '@/lib/queries/strip-undefined';
import { fetchLinkedDocumentsForJobs } from '@/lib/jobs-linked';
import { getCoverLettersRepo } from '@/lib/db/repositories/cover-letters';
import { getCvsRepo } from '@/lib/db/repositories/cvs';
import { getJobsRepo } from '@/lib/db/repositories/jobs';

type RouteContext = { params: Promise<{ id: string }> };

function err(msg: string, code: string | undefined, status: number) {
  return NextResponse.json({ error: msg, code }, { status });
}

function hasJobId(row: Record<string, unknown>, jid: string) {
  const ids = (row.job_ids as string[] | undefined) ?? [];
  return ids.includes(jid);
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    if (!user) return err('Unauthorized', 'UNAUTHORIZED', 401);

    const jid = id?.trim();
    if (!jid) return err('invalid_id', 'INVALID', 400);

    const data = await getJobsRepo().getById(user.id, jid);
    if (!data) return err('Not found', 'NOT_FOUND', 404);
    const job = data as unknown as Job;
    const { cvsByJob, clByJob } = await fetchLinkedDocumentsForJobs(user.id, [job.id]);
    const enriched: Job = {
      ...job,
      cvs: cvsByJob.get(job.id) ?? [],
      cover_letters: clByJob.get(job.id) ?? [],
    };
    return NextResponse.json(enriched);
  } catch (e) {
    console.error('jobs GET [id]', e);
    return err('Failed to fetch job', 'FETCH_FAILED', 500);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    if (!user) return err('Unauthorized', 'UNAUTHORIZED', 401);

    const raw = (await request.json()) as Record<string, unknown>;
    delete raw.id;
    delete raw.user_id;
    delete raw.created_at;
    delete raw.job_description;
    delete raw.status;
    const patch = stripUndefined(raw);

    try {
      const data = await getJobsRepo().update(user.id, id, patch);
      return NextResponse.json(data);
    } catch (e) {
      if (e instanceof Error && e.message === 'Job not found') {
        return err('Not found', 'NOT_FOUND', 404);
      }
      console.error('jobs PATCH', e);
      return err('Failed to update job', 'UPDATE_FAILED', 500);
    }
  } catch (e) {
    console.error('jobs PATCH', e);
    return err('Failed to update job', 'UPDATE_FAILED', 500);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    if (!user) return err('Unauthorized', 'UNAUTHORIZED', 401);

    const jid = id?.trim();
    if (!jid) return err('invalid_id', 'INVALID', 400);
    const now = new Date().toISOString();

    const cvHits = (await getCvsRepo().listByUser(user.id, { includeArchived: true })).filter(
      (r) => hasJobId(r, jid)
    );
    const clHits = (await getCoverLettersRepo().listByUser(user.id, jid));
    const hasLinked = cvHits.length > 0 || clHits.length > 0;

    if (hasLinked) {
      try {
        await getJobsRepo().update(user.id, jid, { status: 'none', updated_at: now });
      } catch (e) {
        console.error('jobs DELETE soft', e);
        return err('Failed to update job', 'UPDATE_FAILED', 500);
      }
      return NextResponse.json({
        deleted: false,
        reason: 'has_linked_documents',
      });
    }

    await getJobsRepo().remove(user.id, jid);
    return NextResponse.json({ deleted: true });
  } catch (e) {
    console.error('jobs DELETE', e);
    return err('Failed to delete job', 'DELETE_FAILED', 500);
  }
}
