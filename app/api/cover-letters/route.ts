import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
    const jobId = url.searchParams.get('jobId');

    let q = supabase.from('cover_letters').select('*').eq('user_id', user.id);
    if (jobId) {
      q = q.contains('job_ids', [jobId]);
    }
    const { data, error } = await q.order('created_at', { ascending: false });
    if (error) {
      console.error('cover-letters GET', error);
      return err('Failed to list cover letters', 'FETCH_FAILED', 500);
    }
    return NextResponse.json(data ?? []);
  } catch (e) {
    console.error('cover-letters GET', e);
    return err('Failed to list cover letters', 'FETCH_FAILED', 500);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return err('Unauthorized', 'UNAUTHORIZED', 401);

    const body = (await request.json().catch(() => ({}))) as {
      content?: string;
      tone?: string | null;
      length?: string | null;
      template_id?: string | null;
      specific_emphasis?: string | null;
      applicant_name?: string | null;
      applicant_role?: string | null;
      applicant_email?: string | null;
      applicant_phone?: string | null;
      applicant_location?: string | null;
      job_ids?: string[];
    };
    if (typeof body.content !== 'string') {
      return err('content is required', 'VALIDATION', 422);
    }

    const jobIds = Array.isArray(body.job_ids)
      ? body.job_ids.filter((x): x is string => typeof x === 'string')
      : [];

    const { data, error } = await supabase
      .from('cover_letters')
      .insert({
        user_id: user.id,
        content: body.content,
        tone: body.tone ?? null,
        length: body.length ?? null,
        template_id: body.template_id?.trim() || 'cl-classic',
        specific_emphasis: body.specific_emphasis?.trim() || null,
        applicant_name: body.applicant_name?.trim() || null,
        applicant_role: body.applicant_role?.trim() || null,
        applicant_email: body.applicant_email?.trim() || null,
        applicant_phone: body.applicant_phone?.trim() || null,
        applicant_location: body.applicant_location?.trim() || null,
        job_ids: jobIds,
      })
      .select()
      .single();
    if (error) {
      console.error('cover-letters POST', error);
      return err('Failed to create cover letter', 'CREATE_FAILED', 500);
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error('cover-letters POST', e);
    return err('Failed to create cover letter', 'CREATE_FAILED', 500);
  }
}
