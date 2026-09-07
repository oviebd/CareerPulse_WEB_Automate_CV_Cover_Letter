import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { generateCoverLetterText } from '@/lib/claude';
import { rateLimitHit } from '@/lib/rate-limit';
import { runWithAiUsageContext } from '@/lib/ai/usage-context';
import { handleAiRouteError } from '@/lib/credits/api-errors';
import type { CoverLetterLength, CoverLetterTone } from '@/types';
import { getCvsRepo } from '@/lib/db/repositories/cvs';

export const runtime = 'nodejs';
export const maxDuration = 120;

const TONES: CoverLetterTone[] = [
  'professional',
  'confident',
  'creative',
  'concise',
  'formal',
];
const LENGTHS: CoverLetterLength[] = ['short', 'medium', 'long'];

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (rateLimitHit(`generate:${user.id}`)) {
      return NextResponse.json({ error: 'RATE_LIMIT' }, { status: 429 });
    }

    const body = (await request.json()) as {
      jobDescription?: string;
      companyName?: string;
      jobTitle?: string;
      tone?: CoverLetterTone;
      length?: CoverLetterLength;
      specificEmphasis?: string;
    };

    if (!body.jobDescription?.trim()) {
      return NextResponse.json({ error: 'job_description_required' }, { status: 400 });
    }

    const cvRows = await getCvsRepo().listByUser(user.id, { includeArchived: true });
    const cvRow =
      cvRows.find(
        (r) => !Array.isArray(r.job_ids) || (r.job_ids as string[]).length === 0
      ) ?? cvRows[0];
    if (!cvRow) {
      return NextResponse.json({ error: 'cv_profile_required' }, { status: 400 });
    }
    if (!cvRow.is_complete && Number(cvRow.completion_percentage ?? 0) < 40) {
      return NextResponse.json({ error: 'cv_profile_incomplete' }, { status: 400 });
    }

    const tone = body.tone && TONES.includes(body.tone) ? body.tone : 'professional';
    const length =
      body.length && LENGTHS.includes(body.length) ? body.length : 'medium';

    const content = await runWithAiUsageContext(
      { userId: user.id, category: 'cover_letter', operation: 'generate' },
      () =>
        generateCoverLetterText({
          cvProfile: cvRow,
          jobDescription: body.jobDescription!,
          companyName: body.companyName?.trim() || 'the company',
          jobTitle: body.jobTitle?.trim() || 'the role',
          tone,
          length,
          specificEmphasis: body.specificEmphasis?.trim() ?? '',
        })
    );

    return NextResponse.json({ content });
  } catch (e) {
    const creditErr = handleAiRouteError(e);
    if (creditErr) return creditErr;
    console.error('generate', e);
    return NextResponse.json({ error: 'generation_failed' }, { status: 500 });
  }
}
