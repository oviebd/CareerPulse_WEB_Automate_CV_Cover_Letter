import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { computeCompletionPercentage } from '@/lib/cv-completion';

export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    const { data, error } = await supabase
      .from('cv_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) {
      console.error('cv GET', error);
      return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
    }
    return NextResponse.json({ cvProfile: data });
  } catch (e) {
    console.error('cv GET', e);
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const patch = (await request.json()) as Record<string, unknown>;
    const forbidden = ['id', 'user_id', 'created_at'];
    for (const k of forbidden) delete patch[k];

    const { data: current } = await supabase
      .from('cv_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    const merged = { ...(current ?? {}), ...patch } as Parameters<
      typeof computeCompletionPercentage
    >[0];
    const { percentage, isComplete } = computeCompletionPercentage(merged);

    const payload = {
      ...patch,
      completion_percentage: percentage,
      is_complete: isComplete,
    };

    if (!current) {
      const { data, error } = await supabase
        .from('cv_profiles')
        .insert({ user_id: user.id, ...payload })
        .select()
        .single();
      if (error) {
        console.error('cv PATCH insert', error);
        return NextResponse.json({ error: 'update_failed' }, { status: 500 });
      }
      return NextResponse.json({ cvProfile: data });
    }

    const { data, error } = await supabase
      .from('cv_profiles')
      .update(payload)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('cv PATCH', error);
      return NextResponse.json({ error: 'update_failed' }, { status: 500 });
    }
    return NextResponse.json({ cvProfile: data });
  } catch (e) {
    console.error('cv PATCH', e);
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }
}
