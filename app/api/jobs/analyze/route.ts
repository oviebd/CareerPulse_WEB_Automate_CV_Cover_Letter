import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { runWithAiUsageContext } from '@/lib/ai/usage-context';
import { rateLimitHit } from '@/lib/rate-limit';
import { resolveEffectiveTier } from '@/lib/dev-subscription';
import { canAccessFeature } from '@/lib/subscription';
import { analyzeJobDescription, emptyAnalysis } from '@/lib/jobs/analyze-job';
import { getCvsRepo } from '@/lib/db/repositories/cvs';
import { getProfilesRepo } from '@/lib/db/repositories/profiles';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (rateLimitHit(`analyze-job:${user.id}`)) {
      return NextResponse.json({ error: 'RATE_LIMIT' }, { status: 429 });
    }

    const body = (await request.json()) as {
      jobDescription?: string;
      jobUrl?: string;
      cvId?: string;
    };

    const jobDescription = body.jobDescription?.trim() ?? '';
    const cvId = typeof body.cvId === 'string' ? body.cvId.trim() : '';
    if (!jobDescription || jobDescription.length < 50) {
      return NextResponse.json(
        { error: 'Please paste a job description (at least 50 characters).' },
        { status: 422 }
      );
    }
    if (!cvId) {
      return NextResponse.json({ error: 'cvId is required' }, { status: 422 });
    }

    const prof = await getProfilesRepo().getById(user.id);
    const tier = resolveEffectiveTier(prof?.subscription_tier);

    if (!canAccessFeature(tier, 'aiExtrasAccess')) {
      return NextResponse.json(
        {
          error: 'UPGRADE_REQUIRED',
          message: 'This feature requires a Pro plan or above.',
          upgrade_url: '/settings/billing',
        },
        { status: 403 }
      );
    }

    const cvRow = await getCvsRepo().getById(user.id, cvId);

    if (!cvRow) {
      return NextResponse.json({ error: 'CV not found' }, { status: 404 });
    }

    try {
      const result = await runWithAiUsageContext(
        { userId: user.id, category: 'job_analysis' },
        () =>
          analyzeJobDescription({
            jobDescription,
            jobUrl: body.jobUrl,
            cvRow: cvRow as Record<string, unknown>,
          })
      );
      return NextResponse.json(result);
    } catch (e) {
      console.error('jobs/analyze claude', e);
      return NextResponse.json(
        { error: 'Analysis failed. Please try again.' },
        { status: 500 }
      );
    }
  } catch (e) {
    console.error('jobs/analyze', e);
    return NextResponse.json(emptyAnalysis());
  }
}
