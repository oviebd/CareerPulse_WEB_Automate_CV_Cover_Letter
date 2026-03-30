import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type RouteContext = { params: { id: string } };

export async function GET(_request: Request, { params }: RouteContext) {
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
      .eq('id', params.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('job-specific GET [id]', error);
      return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    return NextResponse.json({ job_cv: data });
  } catch (e) {
    console.error('job-specific GET [id]', e);
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const patch = (await request.json()) as Record<string, unknown>;
    const forbidden = ['id', 'user_id', 'created_at'];
    for (const k of forbidden) delete patch[k];

    const { data, error } = await supabase
      .from('job_specific_cvs')
      .update(patch)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('job-specific PATCH', error);
      return NextResponse.json({ error: 'update_failed' }, { status: 500 });
    }

    return NextResponse.json({ job_cv: data });
  } catch (e) {
    console.error('job-specific PATCH', e);
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('job_specific_cvs')
      .update({ is_archived: true })
      .eq('id', params.id)
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
