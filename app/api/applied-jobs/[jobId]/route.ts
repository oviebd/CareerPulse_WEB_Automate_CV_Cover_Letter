import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type RouteContext = { params: Promise<{ jobId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { jobId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = jobId?.trim();
    if (!id) {
      return NextResponse.json({ error: 'invalid_job_id' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('applied_jobs')
      .select('id')
      .eq('user_id', user.id)
      .eq('job_id', id)
      .maybeSingle();

    if (error) {
      console.error('applied_jobs GET', error);
      return NextResponse.json({ error: 'lookup_failed' }, { status: 500 });
    }

    return NextResponse.json({ tracked: Boolean(data) });
  } catch (e) {
    console.error('applied_jobs GET', e);
    return NextResponse.json({ error: 'lookup_failed' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { jobId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = jobId?.trim();
    if (!id) {
      return NextResponse.json({ error: 'invalid_job_id' }, { status: 400 });
    }

    const { error } = await supabase
      .from('applied_jobs')
      .delete()
      .eq('user_id', user.id)
      .eq('job_id', id);

    if (error) {
      console.error('applied_jobs DELETE', error);
      return NextResponse.json(
        {
          error: error.message || 'delete_failed',
          code: error.code,
          details: error.details,
          hint: error.hint,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, ok: true });
  } catch (e) {
    console.error('applied_jobs DELETE', e);
    const msg = e instanceof Error ? e.message : 'delete_failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
