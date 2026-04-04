import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { dbRowToCvProfile } from '@/lib/cv-mapper';

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
    const includeArchived = url.searchParams.get('includeArchived') === 'true';
    const generalOnly = url.searchParams.get('generalOnly') === 'true';

    let q = supabase.from('cvs').select('*').eq('user_id', user.id);
    if (!includeArchived) {
      q = q.eq('is_archived', false);
    }
    const { data, error } = await q.order('created_at', { ascending: false });
    if (error) {
      console.error('cvs GET', error);
      return err('Failed to list CVs', 'FETCH_FAILED', 500);
    }
    const rows = (data ?? []) as Record<string, unknown>[];
    const filtered = generalOnly
      ? rows.filter((r) => !Array.isArray(r.job_ids) || r.job_ids.length === 0)
      : rows;
    const cvs = filtered.map(dbRowToCvProfile);
    return NextResponse.json(cvs);
  } catch (e) {
    console.error('cvs GET', e);
    return err('Failed to list CVs', 'FETCH_FAILED', 500);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return err('Unauthorized', 'UNAUTHORIZED', 401);

    const body = (await request.json().catch(() => ({}))) as { name?: string };
    const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'Untitled CV';

    const { data, error } = await supabase
      .from('cvs')
      .insert({ user_id: user.id, name })
      .select()
      .single();
    if (error) {
      console.error('cvs POST', error);
      return err('Failed to create CV', 'CREATE_FAILED', 500);
    }
    return NextResponse.json(dbRowToCvProfile(data as Record<string, unknown>));
  } catch (e) {
    console.error('cvs POST', e);
    return err('Failed to create CV', 'CREATE_FAILED', 500);
  }
}
