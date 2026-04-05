import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { AppliedJobTrackStatus } from '@/types/database';
import {
  isAppliedJobTrackStatus,
  mapTrackStatusToJobBoardStatus,
} from '@/lib/applied-job-track-map';

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
      .select('id, status, updated_at')
      .eq('user_id', user.id)
      .eq('job_id', id)
      .maybeSingle();

    if (error) {
      console.error('applied_jobs GET', error);
      return NextResponse.json({ error: 'lookup_failed' }, { status: 500 });
    }

    const status =
      data && typeof data.status === 'string' && isAppliedJobTrackStatus(data.status)
        ? (data.status as AppliedJobTrackStatus)
        : null;

    return NextResponse.json({
      tracked: Boolean(data),
      status,
      id: data?.id ?? null,
      updated_at: data?.updated_at ?? null,
    });
  } catch (e) {
    console.error('applied_jobs GET', e);
    return NextResponse.json({ error: 'lookup_failed' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
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

    const body = (await request.json()) as { status?: unknown };
    const raw = body.status;
    if (typeof raw !== 'string' || !isAppliedJobTrackStatus(raw.trim())) {
      return NextResponse.json({ error: 'invalid_status' }, { status: 400 });
    }
    const status = raw.trim() as AppliedJobTrackStatus;
    const board = mapTrackStatusToJobBoardStatus(status);
    const now = new Date().toISOString();

    const { data: row, error } = await supabase
      .from('applied_jobs')
      .update({ status, updated_at: now })
      .eq('user_id', user.id)
      .eq('job_id', id)
      .select('id, user_id, job_id, status, updated_at')
      .maybeSingle();

    if (error) {
      console.error('applied_jobs PATCH', error);
      return NextResponse.json({ error: 'update_failed' }, { status: 500 });
    }
    if (!row) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const { error: jobErr } = await supabase
      .from('jobs')
      .update({ status: board, updated_at: now })
      .eq('id', id)
      .eq('user_id', user.id);
    if (jobErr) {
      console.error('applied_jobs PATCH jobs sync', jobErr);
    }

    return NextResponse.json(row);
  } catch (e) {
    console.error('applied_jobs PATCH', e);
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
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
