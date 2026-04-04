import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function err(
  msg: string,
  status: number,
  extra?: { code?: string; details?: string | null; hint?: string | null }
) {
  return NextResponse.json(
    { error: msg, code: extra?.code, details: extra?.details, hint: extra?.hint },
    { status }
  );
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return err('Unauthorized', 401);

    const body = (await request.json()) as { job_id?: string; jobId?: string };
    const jobId =
      (typeof body.jobId === 'string' && body.jobId.trim()) ||
      (typeof body.job_id === 'string' && body.job_id.trim()) ||
      '';
    if (!jobId) return err('jobId is required', 400);

    const { data: job, error: jobErr } = await supabase
      .from('jobs')
      .select('id')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (jobErr || !job) {
      return err('Job not found', 404);
    }

    const { data: existing } = await supabase
      .from('applied_jobs')
      .select('*')
      .eq('user_id', user.id)
      .eq('job_id', jobId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(existing, { status: 200 });
    }

    const { data: row, error } = await supabase
      .from('applied_jobs')
      .insert({
        user_id: user.id,
        job_id: jobId,
        status: 'saved',
      })
      .select()
      .single();

    if (error) {
      console.error('applied_jobs POST', error);
      return err(error.message || 'Failed to track job', 500, {
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
    }

    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    console.error('applied_jobs POST', e);
    const msg = e instanceof Error ? e.message : 'Failed to track job';
    return err(msg, 500);
  }
}
