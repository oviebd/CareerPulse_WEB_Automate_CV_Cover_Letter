import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { dbRowToCvProfile } from '@/lib/cv-mapper';
import type { Job } from '@/types/database';
import { getCvsRepo } from '@/lib/db/repositories/cvs';
import { getJobsRepo } from '@/lib/db/repositories/jobs';

type RouteContext = { params: Promise<{ id: string }> };

async function enrichOne(
  userId: string,
  row: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const profile = dbRowToCvProfile(row);
  const jobIds = (row.job_ids as string[] | undefined) ?? [];
  let jobTitle = '';
  let companyName: string | null = null;
  let jobDescription = '';
  if (jobIds.length > 0) {
    const job = await getJobsRepo().getById(userId, jobIds[0]);
    if (job) {
      const j = job as unknown as Job;
      jobTitle = j.job_title;
      companyName = j.company_name;
      const kw = Array.isArray(j.keywords) ? j.keywords : [];
      jobDescription = kw.length ? kw.join(', ') : '';
    }
  }
  return {
    ...profile,
    job_title: jobTitle,
    company_name: companyName,
    job_description: jobDescription,
    preferred_template_id: profile.preferred_template_id ?? 'classic',
    accent_color: profile.accent_color ?? '#6C63FF',
  };
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await getCvsRepo().getById(user.id, id);
    if (!data) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const enriched = await enrichOne(user.id, data as Record<string, unknown>);
    return NextResponse.json({ job_cv: enriched });
  } catch (e) {
    console.error('job-specific GET [id]', e);
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const patch = (await request.json()) as Record<string, unknown>;
    const forbidden = ['id', 'user_id', 'created_at'];
    for (const k of forbidden) delete patch[k];
    delete patch.job_description;

    if (patch.job_title != null || patch.company_name != null || patch.keywords != null) {
      const cvRow = await getCvsRepo().getById(user.id, id);
      const jids = (cvRow?.job_ids as string[] | undefined) ?? [];
      if (jids.length > 0) {
        const kwPatch =
          Array.isArray(patch.keywords) && patch.keywords.every((x) => typeof x === 'string')
            ? (patch.keywords as string[])
            : undefined;
        await getJobsRepo().update(user.id, jids[0], {
          ...(typeof patch.company_name === 'string' ? { company_name: patch.company_name } : {}),
          ...(typeof patch.job_title === 'string' ? { job_title: patch.job_title } : {}),
          ...(kwPatch ? { keywords: kwPatch } : {}),
        });
      }
      delete patch.job_title;
      delete patch.company_name;
      delete patch.keywords;
    }

    const data = await getCvsRepo().update(user.id, id, patch);
    const enriched = await enrichOne(user.id, data as Record<string, unknown>);
    return NextResponse.json({ job_cv: enriched });
  } catch (e) {
    console.error('job-specific PATCH', e);
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await getCvsRepo().remove(user.id, id, false);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('job-specific DELETE', e);
    return NextResponse.json({ error: 'archive_failed' }, { status: 500 });
  }
}
