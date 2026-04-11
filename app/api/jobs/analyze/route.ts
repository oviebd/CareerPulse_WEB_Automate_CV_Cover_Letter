import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { rateLimitHit } from '@/lib/rate-limit';
import { resolveEffectiveTier } from '@/lib/dev-subscription';
import { canAccessFeature } from '@/lib/subscription';
import type { JobAnalysisResult } from '@/types';
import { migrateLegacyCVData } from '@/src/utils/cvDefaults';

export const runtime = 'nodejs';
export const maxDuration = 120;

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ANALYZER_MODEL =
  process.env.CV_ANALYZER_API_MODEL?.trim() || 'claude-haiku-4-5-20251001';

function emptyAnalysis(): JobAnalysisResult {
  return {
    jobTitle: null,
    company: null,
    shortDescription: '',
    keyRequirements: [],
    region: null,
    workType: null,
    matchPercentage: 0,
    whyGoodFit: [],
    whyNotGoodFit: [],
    keywords: [],
    jobSummary: '',
  };
}

function normalizeAnalysis(raw: Record<string, unknown>): JobAnalysisResult {
  const wt = raw.workType;
  let workType: JobAnalysisResult['workType'] = null;
  if (wt === 'remote' || wt === 'onsite' || wt === 'hybrid') workType = wt;

  const kw = raw.keywords;
  const keywords = Array.isArray(kw)
    ? kw.filter((x): x is string => typeof x === 'string').map((s) => s.trim()).filter(Boolean).slice(0, 30)
    : [];

  const req = raw.keyRequirements;
  const keyRequirements = Array.isArray(req)
    ? req.filter((x): x is string => typeof x === 'string').map((s) => s.trim()).filter(Boolean)
    : [];

  const good = raw.whyGoodFit;
  const whyGoodFit = Array.isArray(good)
    ? good.filter((x): x is string => typeof x === 'string').map((s) => s.trim()).filter(Boolean)
    : [];

  const bad = raw.whyNotGoodFit;
  const whyNotGoodFit = Array.isArray(bad)
    ? bad.filter((x): x is string => typeof x === 'string').map((s) => s.trim()).filter(Boolean)
    : [];

  let matchPercentage = Number(raw.matchPercentage);
  if (!Number.isFinite(matchPercentage)) matchPercentage = 0;
  matchPercentage = Math.max(0, Math.min(100, Math.round(matchPercentage)));

  return {
    jobTitle: typeof raw.jobTitle === 'string' ? raw.jobTitle.trim() || null : null,
    company: typeof raw.company === 'string' ? raw.company.trim() || null : null,
    shortDescription: typeof raw.shortDescription === 'string' ? raw.shortDescription.trim() : '',
    keyRequirements,
    region: typeof raw.region === 'string' ? raw.region.trim() || null : null,
    workType,
    matchPercentage,
    whyGoodFit,
    whyNotGoodFit,
    keywords,
    jobSummary: typeof raw.jobSummary === 'string' ? raw.jobSummary.trim() : '',
  };
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
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

    const { data: prof } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();
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

    const { data: cvRow, error: cvErr } = await supabase
      .from('cvs')
      .select('*')
      .eq('user_id', user.id)
      .eq('id', cvId)
      .maybeSingle();

    if (cvErr || !cvRow) {
      return NextResponse.json({ error: 'CV not found' }, { status: 404 });
    }

    const cvData = migrateLegacyCVData(cvRow as Record<string, unknown>);

    const systemPrompt = `You are a professional CV analyst. Analyze the provided job description against the candidate's CV.
Return ONLY a valid JSON object with this exact structure, no explanation, no markdown:
{
"jobTitle": "string or null",
"company": "string or null",
"shortDescription": "2-3 sentence summary of the role",
"keyRequirements": ["requirement 1", "requirement 2", "requirement 3", "requirement 4"],
"region": "location/region or null if not mentioned",
"workType": "remote | onsite | hybrid | null",
"matchPercentage": 0-100,
"whyGoodFit": ["strength point 1", "strength point 2", "strength point 3"],
"whyNotGoodFit": ["weakness point 1", "weakness point 2"],
"keywords": ["keyword1", "keyword2", ...up to 30],
"jobSummary": "A comprehensive structured summary of the job (200-300 words) covering role, responsibilities, requirements, culture fit indicators, and must-haves. Written to be used as context for CV/cover letter generation."
}`;

    const urlNote = body.jobUrl?.trim() ? `\nJob posting URL (context only): ${body.jobUrl.trim()}` : '';

    const userPrompt = `CANDIDATE CV (JSON):
${JSON.stringify(cvData, null, 2)}

JOB DESCRIPTION:
${jobDescription}${urlNote}`;

    let rawText = '';
    try {
      const message = await claude.messages.create({
        model: ANALYZER_MODEL,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });
      const block = message.content[0];
      rawText = block.type === 'text' ? block.text : '';
    } catch (e) {
      console.error('jobs/analyze claude', e);
      return NextResponse.json(
        { error: 'Analysis failed. Please try again.' },
        { status: 500 }
      );
    }

    const clean = rawText.replace(/```json|```/g, '').trim();
    try {
      const parsed = JSON.parse(clean) as Record<string, unknown>;
      const result = normalizeAnalysis(parsed);
      return NextResponse.json(result);
    } catch {
      console.error('jobs/analyze parse', clean.slice(0, 400));
      return NextResponse.json(emptyAnalysis());
    }
  } catch (e) {
    console.error('jobs/analyze', e);
    return NextResponse.json({ error: 'analysis_failed' }, { status: 500 });
  }
}
