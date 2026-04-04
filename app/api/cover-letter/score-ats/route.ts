import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { scoreATS } from '@/lib/claude';
import { resolveEffectiveTier } from '@/lib/dev-subscription';
import { canAccessFeature } from '@/lib/subscription';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as {
      jobDescription?: string;
      coverLetter?: string;
    };
    const jd = body.jobDescription?.trim() ?? '';
    const cl = body.coverLetter?.trim() ?? '';
    if (!jd || !cl) {
      return NextResponse.json({ error: 'jobDescription and coverLetter required' }, { status: 400 });
    }

    const { data: prof } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();
    const tier = resolveEffectiveTier(prof?.subscription_tier);
    if (!canAccessFeature(tier, 'atsAccess')) {
      return NextResponse.json({ error: 'ATS not available on your plan' }, { status: 403 });
    }

    const ats = await scoreATS(jd, cl);
    return NextResponse.json({
      score: ats.score,
      summary: ats.summary,
      found: ats.keywords_found,
      missing: ats.keywords_missing,
    });
  } catch (e) {
    console.error('score-ats', e);
    return NextResponse.json({ error: 'score_failed' }, { status: 500 });
  }
}
