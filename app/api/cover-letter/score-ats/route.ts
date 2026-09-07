import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { scoreATS } from '@/lib/claude';
import { runWithAiUsageContext } from '@/lib/ai/usage-context';
import { handleAiRouteError } from '@/lib/credits/api-errors';

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
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

    const ats = await runWithAiUsageContext(
      { userId: user.id, category: 'cover_letter', operation: 'score_ats' },
      () => scoreATS(jd, cl)
    );
    return NextResponse.json({
      score: ats.score,
      summary: ats.summary,
      found: ats.keywords_found,
      missing: ats.keywords_missing,
    });
  } catch (e) {
    const creditErr = handleAiRouteError(e);
    if (creditErr) return creditErr;
    console.error('score-ats', e);
    return NextResponse.json({ error: 'score_failed' }, { status: 500 });
  }
}
