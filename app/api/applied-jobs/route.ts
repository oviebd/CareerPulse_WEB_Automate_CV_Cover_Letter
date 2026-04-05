import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { AppliedJobTrackStatus } from '@/types/database';
import {
  isAppliedJobTrackStatus,
  mapTrackStatusToJobBoardStatus,
} from '@/lib/applied-job-track-map';

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

    const body = (await request.json()) as {
      job_id?: string;
      jobId?: string;
      status?: unknown;
    };
    const jobId =
      (typeof body.jobId === 'string' && body.jobId.trim()) ||
      (typeof body.job_id === 'string' && body.job_id.trim()) ||
      '';
    if (!jobId) return err('jobId is required', 400);

    let trackStatus: AppliedJobTrackStatus = 'apply_later';
    if (body.status != null) {
      if (typeof body.status !== 'string' || !isAppliedJobTrackStatus(body.status.trim())) {
        return err('invalid_status', 400);
      }
      trackStatus = body.status.trim() as AppliedJobTrackStatus;
    }
    const boardStatus = mapTrackStatusToJobBoardStatus(trackStatus);
    const now = new Date().toISOString();

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

    const { error: jobUpErr } = await supabase
      .from('jobs')
      .update({ status: boardStatus, updated_at: now })
      .eq('id', jobId)
      .eq('user_id', user.id);
    if (jobUpErr) {
      console.error('applied_jobs POST jobs sync', jobUpErr);
    }

    const { data: row, error } = await supabase
      .from('applied_jobs')
      .insert({
        user_id: user.id,
        job_id: jobId,
        status: trackStatus,
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
