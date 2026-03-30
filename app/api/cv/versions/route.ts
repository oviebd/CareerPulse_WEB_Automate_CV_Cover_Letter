import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('cv_profiles')
      .select('id, full_name, completion_percentage, is_complete, created_at, preferred_cv_template_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('cv versions GET', error);
      return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
    }

    return NextResponse.json({ versions: data ?? [] });
  } catch (e) {
    console.error('cv versions route', e);
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }
}

