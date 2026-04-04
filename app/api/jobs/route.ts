import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Job } from '@/types/database';
import { stripUndefined } from '@/lib/queries/strip-undefined';

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
    const status = url.searchParams.get('status') as Job['status'] | null;
    const starred = url.searchParams.get('starred');

    let q = supabase.from('jobs').select('*').eq('user_id', user.id);
    if (status) {
      q = q.eq('status', status);
    }
    if (starred === 'true') {
      q = q.eq('is_starred', true);
    }
    const { data, error } = await q.order('updated_at', { ascending: false });
    if (error) {
      console.error('jobs GET', error);
      return err('Failed to list jobs', 'FETCH_FAILED', 500);
    }
    return NextResponse.json(data ?? []);
  } catch (e) {
    console.error('jobs GET', e);
    return err('Failed to list jobs', 'FETCH_FAILED', 500);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return err('Unauthorized', 'UNAUTHORIZED', 401);

    const body = (await request.json()) as Record<string, unknown>;
    const company_name = body.company_name;
    const job_title = body.job_title;
    if (typeof company_name !== 'string' || !company_name.trim()) {
      return err('company_name is required', 'VALIDATION', 400);
    }
    if (typeof job_title !== 'string' || !job_title.trim()) {
      return err('job_title is required', 'VALIDATION', 400);
    }

    delete body.id;
    delete body.user_id;
    delete body.created_at;
    delete body.updated_at;

    const payload = stripUndefined(body) as Record<string, unknown>;
    const { data, error } = await supabase
      .from('jobs')
      .insert({ ...payload, user_id: user.id, company_name: company_name.trim(), job_title: job_title.trim() })
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
