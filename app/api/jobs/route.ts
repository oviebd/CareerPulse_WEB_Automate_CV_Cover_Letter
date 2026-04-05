import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Job } from '@/types/database';
import { stripUndefined } from '@/lib/queries/strip-undefined';
import { fetchLinkedDocumentsForJobs } from '@/lib/jobs-linked';
import { isJobStatus } from '@/lib/job-status';

function err(msg: string, code: string | undefined, status: number) {
  return NextResponse.json({ error: msg, code }, { status });
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return err('Unauthorized', 'UNAUTHORIZED', 401);

    const url = new URL(request.url);
    const statusFilter = url.searchParams.get('status') as Job['status'] | null;
    const starred = url.searchParams.get('starred');
    const listAll = url.searchParams.get('all') === '1';

    let q = supabase.from('jobs').select('*').eq('user_id', user.id);
    if (!listAll) {
      q = q.neq('status', 'none');
    }
    if (statusFilter) {
      q = q.eq('status', statusFilter);
    }
    if (starred === 'true') {
      q = q.eq('is_starred', true);
    }
    const { data, error } = await q.order('updated_at', { ascending: false });
    if (error) {
      console.error('jobs GET', error);
      return err('Failed to list jobs', 'FETCH_FAILED', 500);
    }
    const rows = (data ?? []) as Job[];
    const ids = rows.map((j) => j.id);
    const { cvsByJob, clByJob } = await fetchLinkedDocumentsForJobs(
      supabase,
      user.id,
      ids
    );
    const withLinks: Job[] = rows.map((j) => ({
      ...j,
      cvs: cvsByJob.get(j.id) ?? [],
      cover_letters: clByJob.get(j.id) ?? [],
    }));
    return NextResponse.json(withLinks);
  } catch (e) {
    console.error('jobs GET', e);
    return err('Failed to list jobs', 'FETCH_FAILED', 500);
  }
}

function normalizeKeywords(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((k): k is string => typeof k === 'string')
    .map((k) => k.trim())
    .filter(Boolean);
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return err('Unauthorized', 'UNAUTHORIZED', 401);

    const body = (await request.json()) as Record<string, unknown>;

    const titleRaw =
      (typeof body.title === 'string' && body.title) ||
      (typeof body.job_title === 'string' && body.job_title) ||
      '';
    const companyRaw =
      (typeof body.company === 'string' && body.company) ||
      (typeof body.company_name === 'string' && body.company_name) ||
      '';
    const job_title = titleRaw.trim() || 'Untitled role';
    const company_name = companyRaw.trim() || 'Company';
    const job_url =
      typeof body.url === 'string'
        ? body.url.trim() || null
        : typeof body.job_url === 'string'
          ? body.job_url.trim() || null
          : null;
    const keywords = normalizeKeywords(body.keywords);
    const job_summary =
      typeof body.job_summary === 'string' ? body.job_summary.trim() || null : null;

    delete body.id;
    delete body.user_id;
    delete body.created_at;
    delete body.updated_at;

    const payload = stripUndefined(body) as Record<string, unknown>;
    delete payload.title;
    delete payload.company;
    delete payload.url;
    delete payload.keywords;
    delete payload.job_summary;
    delete payload.job_title;
    delete payload.company_name;
    delete payload.job_url;
    delete (payload as Record<string, unknown>).job_description;

    let initialStatus: Job['status'] | undefined;
    if (typeof body.status === 'string' && isJobStatus(body.status.trim())) {
      initialStatus = body.status.trim() as Job['status'];
    }
    delete payload.status;

    const { data, error } = await supabase
      .from('jobs')
      .insert({
        ...payload,
        user_id: user.id,
        company_name,
        job_title,
        job_url,
        keywords,
        job_summary,
        ...(initialStatus ? { status: initialStatus } : {}),
      })
      .select()
      .single();
    if (error) {
      console.error('jobs POST', error);
      return err('Failed to create job', 'CREATE_FAILED', 500);
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error('jobs POST', e);
    return err('Failed to create job', 'CREATE_FAILED', 500);
  }
}
