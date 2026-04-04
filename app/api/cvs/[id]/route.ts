import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { dbRowToCvProfile } from '@/lib/cv-mapper';
import { mergeAndCompleteCv, normalizeCvPatchBody } from '@/lib/cv-api-merge';
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

    const { data, error } = await supabase
      .from('cvs')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) {
      console.error('cvs GET [id]', error);
      return err('Failed to fetch CV', 'FETCH_FAILED', 500);
    }
    if (!data) return err('Not found', 'NOT_FOUND', 404);
    return NextResponse.json(dbRowToCvProfile(data as Record<string, unknown>));
  } catch (e) {
    console.error('cvs GET [id]', e);
    return err('Failed to fetch CV', 'FETCH_FAILED', 500);
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
    const patch = normalizeCvPatchBody(raw);

    const { data: current, error: curErr } = await supabase
      .from('cvs')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (curErr) {
      console.error('cvs PATCH load', curErr);
      return err('Failed to update CV', 'UPDATE_FAILED', 500);
    }
    if (!current) return err('Not found', 'NOT_FOUND', 404);

    const withCompletion = mergeAndCompleteCv(current as Record<string, unknown>, patch);
    const payload = stripUndefined(withCompletion);

    const { data: updated, error } = await supabase
      .from('cvs')
      .update(payload)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
    if (error) {
      console.error('cvs PATCH', error);
      return err('Failed to update CV', 'UPDATE_FAILED', 500);
    }
    return NextResponse.json(dbRowToCvProfile(updated as Record<string, unknown>));
  } catch (e) {
    console.error('cvs PATCH', e);
    return err('Failed to update CV', 'UPDATE_FAILED', 500);
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return err('Unauthorized', 'UNAUTHORIZED', 401);

    const url = new URL(request.url);
    const hard = url.searchParams.get('hard') === 'true';

    if (hard) {
      const { error } = await supabase.from('cvs').delete().eq('id', id).eq('user_id', user.id);
      if (error) {
        console.error('cvs DELETE hard', error);
        return err('Failed to delete CV', 'DELETE_FAILED', 500);
      }
      return NextResponse.json({ ok: true });
    }

    const { error } = await supabase
      .from('cvs')
      .update({ is_archived: true })
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) {
      console.error('cvs DELETE archive', error);
      return err('Failed to archive CV', 'ARCHIVE_FAILED', 500);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('cvs DELETE', e);
    return err('Failed to delete CV', 'DELETE_FAILED', 500);
  }
}
