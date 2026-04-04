import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { dbRowToCvProfile } from '@/lib/cv-mapper';
import type { Job } from '@/types/database';

async function enrichJobCv(
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

export async function GET() {
  try {
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
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('job-specific GET', error);
      return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
    }

    const rows = (data ?? []) as Record<string, unknown>[];
    const tailored = rows.filter(
      (r) => Array.isArray(r.job_ids) && (r.job_ids as string[]).length > 0
    );
    const enriched = await Promise.all(
      tailored.map((r) => enrichJobCv(supabase, user.id, r))
    );

    return NextResponse.json({ job_cvs: enriched });
  } catch (e) {
    console.error('job-specific GET', e);
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;

    if (!body.job_description) {
      return NextResponse.json(
        { error: 'job_description is required' },
        { status: 422 }
      );
    }

    const cv_data = body.cv_data as Record<string, unknown> | undefined;
    if (!cv_data) {
      return NextResponse.json(
        { error: 'cv_data is required' },
        { status: 422 }
      );
    }

    const jobDescription = String(body.job_description ?? '').trim();
    const resolvedJobTitle = String(body.job_title ?? '').trim();
    const resolvedCompanyName = String(body.company_name ?? '').trim();
    if (!resolvedJobTitle || !resolvedCompanyName) {
      return NextResponse.json(
        { error: 'job_title and company_name are required' },
        { status: 422 }
      );
    }

    const legacyJobId =
      typeof body.job_application_id === 'string' ? body.job_application_id : null;

    let jobId: string;

    if (legacyJobId) {
      const { data: existing } = await supabase
        .from('jobs')
        .select('id')
        .eq('id', legacyJobId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (existing) {
        await supabase
          .from('jobs')
          .update({
            company_name: resolvedCompanyName,
            job_title: resolvedJobTitle,
            job_description: jobDescription,
          })
          .eq('id', legacyJobId)
          .eq('user_id', user.id);
        jobId = legacyJobId;
      } else {
        const { data: created, error: cErr } = await supabase
          .from('jobs')
          .insert({
            id: legacyJobId,
            user_id: user.id,
            company_name: resolvedCompanyName,
            job_title: resolvedJobTitle,
            job_description: jobDescription,
          })
          .select('id')
          .single();
        if (cErr || !created) {
          console.error('job insert', cErr);
          return NextResponse.json({ error: 'save_failed' }, { status: 500 });
        }
        jobId = created.id as string;
      }
    } else {
      const { data: jobRow, error: jobErr } = await supabase
        .from('jobs')
        .insert({
          user_id: user.id,
          company_name: resolvedCompanyName,
          job_title: resolvedJobTitle,
          job_description: jobDescription,
        })
        .select('id')
        .single();
      if (jobErr || !jobRow) {
        console.error('job-specific job insert', jobErr);
        return NextResponse.json({ error: 'save_failed' }, { status: 500 });
      }
      jobId = jobRow.id as string;
    }

    const cvName = `${resolvedJobTitle} — ${resolvedCompanyName}`;

    const { data, error } = await supabase
      .from('cvs')
      .insert({
        user_id: user.id,
        name: cvName,
        job_ids: [jobId],
        full_name: cv_data.full_name ?? null,
        professional_title: cv_data.professional_title ?? null,
        email: cv_data.email ?? null,
        phone: cv_data.phone ?? null,
        location: cv_data.location ?? null,
        linkedin_url: cv_data.linkedin_url ?? null,
        github_url: cv_data.github_url ?? null,
        links: cv_data.links ?? [],
        summary: cv_data.summary ?? null,
        experience: cv_data.experience ?? [],
        education: cv_data.education ?? [],
        skills: cv_data.skills ?? [],
        projects: cv_data.projects ?? [],
        certifications: cv_data.certifications ?? [],
        languages: cv_data.languages ?? [],
        awards: cv_data.awards ?? [],
        referrals: cv_data.referrals ?? [],
        ai_changes_summary: body.ai_changes_summary ?? null,
        keywords_added: body.keywords_added ?? [],
        bullets_improved: body.bullets_improved ?? 0,
        preferred_template_id: body.preferred_template_id ?? 'classic',
        accent_color: body.accent_color ?? '#6C63FF',
        font_family: (cv_data as { font_family?: string }).font_family ?? 'Inter',
      })
      .select('id')
      .single();

    if (error) {
      console.error('job-specific POST cv', error);
      return NextResponse.json({ error: 'save_failed' }, { status: 500 });
    }

    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (e) {
    console.error('job-specific POST', e);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
}
