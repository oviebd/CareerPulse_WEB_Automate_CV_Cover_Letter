import type { JobAnalysisResult } from '@/types';
import { migrateLegacyCVData } from '@/src/utils/cvDefaults';
import {
  INTERVIEW_ANALYZER_MODEL,
  claudeComplete,
} from '@/lib/ai/anthropic-gateway';

export function emptyAnalysis(): JobAnalysisResult {
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

export function normalizeJobAnalysis(raw: Record<string, unknown>): JobAnalysisResult {
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

const SYSTEM_PROMPT = `You are a professional CV analyst. Analyze the provided job description against the candidate's CV.
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

export async function analyzeJobDescription(opts: {
  jobDescription: string;
  jobUrl?: string;
  cvRow: Record<string, unknown>;
}): Promise<JobAnalysisResult> {
  const cvData = migrateLegacyCVData(opts.cvRow);
  const urlNote = opts.jobUrl?.trim() ? `\nJob posting URL (context only): ${opts.jobUrl.trim()}` : '';
  const userPrompt = `CANDIDATE CV (JSON):
${JSON.stringify(cvData, null, 2)}

JOB DESCRIPTION:
${opts.jobDescription}${urlNote}`;

  const { text: rawText } = await claudeComplete({
    system: SYSTEM_PROMPT,
    user: userPrompt,
    maxTokens: 4096,
    model: INTERVIEW_ANALYZER_MODEL,
    category: 'job_analysis',
    operation: 'analyze',
  });

  const clean = rawText.replace(/```json|```/g, '').trim();
  try {
    const parsed = JSON.parse(clean) as Record<string, unknown>;
    return normalizeJobAnalysis(parsed);
  } catch {
    console.error('analyzeJobDescription parse', clean.slice(0, 400));
    return emptyAnalysis();
  }
}
