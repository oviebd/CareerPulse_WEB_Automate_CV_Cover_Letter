import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('job_specific_cvs')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('job-specific GET', error);
      return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
    }

    return NextResponse.json({ job_cvs: data });
  } catch (e) {
    console.error('job-specific GET', e);
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;

    if (!body.job_title || !body.job_description) {
      return NextResponse.json(
        { error: 'job_title and job_description are required' },
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

    const row = {
      user_id: user.id,
      job_title: body.job_title,
      company_name: body.company_name ?? null,
      job_description: body.job_description,
      full_name: cv_data.full_name ?? null,
      professional_title: cv_data.professional_title ?? null,
      email: cv_data.email ?? null,
      phone: cv_data.phone ?? null,
      location: cv_data.location ?? null,
      linkedin_url: cv_data.linkedin_url ?? null,
      portfolio_url: cv_data.portfolio_url ?? null,
      website_url: cv_data.website_url ?? null,
      summary: cv_data.summary ?? null,
      experience: cv_data.experience ?? [],
      education: cv_data.education ?? [],
      skills: cv_data.skills ?? [],
      projects: cv_data.projects ?? [],
      certifications: cv_data.certifications ?? [],
      languages: cv_data.languages ?? [],
      awards: cv_data.awards ?? [],
      ai_changes_summary: body.ai_changes_summary ?? null,
      keywords_added: body.keywords_added ?? [],
      bullets_improved: body.bullets_improved ?? 0,
      preferred_template_id: body.preferred_template_id ?? null,
      accent_color: body.accent_color ?? '#6C63FF',
      job_application_id: body.job_application_id ?? null,
    };

    const { data, error } = await supabase
      .from('job_specific_cvs')
      .insert(row)
      .select('id')
      .single();

    if (error) {
      console.error('job-specific POST', error);
      return NextResponse.json({ error: 'save_failed' }, { status: 500 });
    }

    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (e) {
    console.error('job-specific POST', e);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
}
