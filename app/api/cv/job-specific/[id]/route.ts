import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { dbRowToCvProfile } from '@/lib/cv-mapper';
import type { Job } from '@/types/database';

type RouteContext = { params: Promise<{ id: string }> };

async function enrichOne(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  row: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const profile = dbRowToCvProfile(row);
  const jobIds = (row.job_ids as string[] | undefined) ?? [];
  let jobTitle = '';
  let companyName: string | null = null;
  let jobDescription = '';
  if (jobIds.length > 0) {
    const { data: job } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobIds[0])
      .eq('user_id', userId)
      .maybeSingle();
    if (job) {
      const j = job as Job;
      jobTitle = j.job_title;
      companyName = j.company_name;
      jobDescription = j.job_description ?? '';
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
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('cvs')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('job-specific GET [id]', error);
      return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const enriched = await enrichOne(supabase, user.id, data as Record<string, unknown>);
    return NextResponse.json({ job_cv: enriched });
  } catch (e) {
    console.error('job-specific GET [id]', e);
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const patch = (await request.json()) as Record<string, unknown>;
    const forbidden = ['id', 'user_id', 'created_at'];
    for (const k of forbidden) delete patch[k];

    if (patch.job_title != null || patch.company_name != null || patch.job_description != null) {
      const { data: cvRow } = await supabase
        .from('cvs')
        .select('job_ids')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle();
      const jids = (cvRow?.job_ids as string[] | undefined) ?? [];
      if (jids.length > 0) {
        await supabase
          .from('jobs')
          .update({
            ...(typeof patch.company_name === 'string'
              ? { company_name: patch.company_name }
              : {}),
            ...(typeof patch.job_title === 'string' ? { job_title: patch.job_title } : {}),
            ...(typeof patch.job_description === 'string'
              ? { job_description: patch.job_description }
              : {}),
          })
          .eq('id', jids[0])
          .eq('user_id', user.id);
      }
      delete patch.job_title;
      delete patch.company_name;
      delete patch.job_description;
    }

    const { data, error } = await supabase
      .from('cvs')
      .update(patch)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('job-specific PATCH', error);
      return NextResponse.json({ error: 'update_failed' }, { status: 500 });
    }

    const enriched = await enrichOne(supabase, user.id, data as Record<string, unknown>);
    return NextResponse.json({ job_cv: enriched });
  } catch (e) {
    console.error('job-specific PATCH', e);
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('cvs')
      .update({ is_archived: true })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('job-specific DELETE', error);
      return NextResponse.json({ error: 'archive_failed' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('job-specific DELETE', e);
    return NextResponse.json({ error: 'archive_failed' }, { status: 500 });
  }
}
