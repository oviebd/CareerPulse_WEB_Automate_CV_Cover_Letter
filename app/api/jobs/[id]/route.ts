import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Job } from '@/types/database';
import { stripUndefined } from '@/lib/queries/strip-undefined';

type RouteContext = { params: Promise<{ id: string }> };

function err(msg: string, code: string | undefined, status: number) {
  return NextResponse.json({ error: msg, code }, { status });
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return err('Unauthorized', 'UNAUTHORIZED', 401);

    const jid = id?.trim();
    if (!jid) return err('invalid_id', 'INVALID', 400);

    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jid)
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) {
      console.error('jobs GET [id]', error);
      return err('Failed to fetch job', 'FETCH_FAILED', 500);
    }
    if (!data) return err('Not found', 'NOT_FOUND', 404);
    return NextResponse.json(data as Job);
  } catch (e) {
    console.error('jobs GET [id]', e);
    return err('Failed to fetch job', 'FETCH_FAILED', 500);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return err('Unauthorized', 'UNAUTHORIZED', 401);

    const raw = (await request.json()) as Record<string, unknown>;
    delete raw.id;
    delete raw.user_id;
    delete raw.created_at;
    delete raw.job_description;
    const patch = stripUndefined(raw);

    const { data, error } = await supabase
      .from('jobs')
      .update(patch)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
    if (error) {
      console.error('jobs PATCH', error);
      return err('Failed to update job', 'UPDATE_FAILED', 500);
    }
    if (!data) return err('Not found', 'NOT_FOUND', 404);
    return NextResponse.json(data);
  } catch (e) {
    console.error('jobs PATCH', e);
    return err('Failed to update job', 'UPDATE_FAILED', 500);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return err('Unauthorized', 'UNAUTHORIZED', 401);

    const { error } = await supabase.from('jobs').delete().eq('id', id).eq('user_id', user.id);
    if (error) {
      console.error('jobs DELETE', error);
      return err('Failed to delete job', 'DELETE_FAILED', 500);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('jobs DELETE', e);
    return err('Failed to delete job', 'DELETE_FAILED', 500);
  }
}
