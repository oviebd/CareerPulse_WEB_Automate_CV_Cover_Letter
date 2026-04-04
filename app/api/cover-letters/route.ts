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

    const body = (await request.json().catch(() => ({}))) as { name?: string };
    const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'Untitled Cover Letter';

    const { data, error } = await supabase
      .from('cover_letters')
      .insert({ user_id: user.id, name })
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
