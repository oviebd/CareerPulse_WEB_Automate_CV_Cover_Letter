import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CLAUDE_MODEL, generateCoverLetterText } from '@/lib/claude';
import { rateLimitHit } from '@/lib/rate-limit';
import { resolveEffectiveTier } from '@/lib/dev-subscription';
import { canAccessFeature } from '@/lib/subscription';
import Anthropic from '@anthropic-ai/sdk';
import type {
  CVData,
  CoverLetterLength,
  CoverLetterTone,
  CVProfile,
  GenerationType,
} from '@/types';
import { migrateLegacyCVData } from '@/src/utils/cvDefaults';

export const runtime = 'nodejs';
export const maxDuration = 120;

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TONES: CoverLetterTone[] = [
  'professional',
  'confident',
  'creative',
  'concise',
  'formal',
];
const LENGTHS: CoverLetterLength[] = ['short', 'medium', 'long'];

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 30000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const o = err as { status?: number; type?: string };
      const retryable = o?.status === 429 || o?.type === 'overloaded_error';
      if (!retryable || attempt === maxRetries - 1) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error('Max retries exceeded');
}

interface OptimisedCVResponse {
  optimised_cv: CVData;
  ai_changes_summary: string;
  keywords_added: string[];
  bullets_improved: number;
  inferred_job_title?: string | null;
  inferred_company_name?: string | null;
}

function validateOptimisedCV(
  original: CVData,
  optimised: CVData
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  if (optimised.experience.length > original.experience.length) {
    warnings.push('AI attempted to add new experience entries — reverted to original');
    optimised.experience = original.experience;
  }

  original.experience.forEach((orig, i) => {
    const opt = optimised.experience[i];
    if (opt && (opt.company !== orig.company || opt.role !== orig.role)) {
      warnings.push(`AI changed company/title for ${orig.company} — reverted`);
      optimised.experience[i].company = orig.company;
      optimised.experience[i].role = orig.role;
    }
  });

  if (optimised.education.length > original.education.length) {
    warnings.push('AI attempted to add new education entries — reverted to original');
    optimised.education = original.education;
  }

  original.education.forEach((orig, i) => {
    const opt = optimised.education[i];
    if (opt && opt.institution !== orig.institution) {
      warnings.push('AI changed institution name — reverted');
      optimised.education[i].institution = orig.institution;
    }
  });

  original.experience.forEach((orig, i) => {
    const opt = optimised.experience[i];
    if (
      opt &&
      (opt.startDate !== orig.startDate || opt.endDate !== orig.endDate)
    ) {
      optimised.experience[i].startDate = orig.startDate;
      optimised.experience[i].endDate = orig.endDate;
      optimised.experience[i].current = orig.current;
    }
  });

  return { valid: warnings.length === 0, warnings };
}

type CvRow = {
  full_name?: string | null;
  professional_title?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  links?: unknown;
  address?: string | null;
  photo_url?: string | null;
  summary?: string | null;
  experience?: unknown;
  education?: unknown;
  skills?: unknown;
  projects?: unknown;
  certifications?: unknown;
  languages?: unknown;
  awards?: unknown;
  referrals?: unknown;
  job_ids?: string[] | null;
};

function rowToCvData(cvRow: CvRow): CVData {
  return migrateLegacyCVData({
    ...cvRow,
    section_visibility: {},
  });
}

async function generateOptimisedCvJson(params: {
  cvData: CVData;
  jobDescription: string;
  jobTitleInput: string;
  companyInput: string;
}): Promise<{
  cvContent: string;
  extractedKeywords: string[];
  jobTitle: string | null;
  companyName: string | null;
  ai_changes_summary: string;
  bullets_improved: number;
  warnings: string[];
}> {
  const { cvData, jobDescription, jobTitleInput, companyInput } = params;
  const displayTitle = jobTitleInput || '(infer from job description)';
  const displayCompany = companyInput || '(infer from job description)';

  const systemPrompt = `You are an expert CV/resume optimiser and career coach with 15 years of experience helping candidates get shortlisted for competitive roles.

Your task is to optimise a candidate's existing CV for a specific job description. You must follow these rules absolutely:

RULES — READ CAREFULLY:
0. Primary objective: maximize ATS match to the target job description as much as possible while remaining 100% truthful to the candidate's existing CV.
1. You may ONLY use information that already exists in the candidate's CV. Never invent, fabricate, or assume any experience, skill, qualification, or achievement.
2. You may NOT add new jobs, companies, education institutions, or certifications that are not already in the CV.
3. You may NOT change job titles, company names, education institution names, or dates.
4. You MAY: reorder bullet points within an experience entry to lead with the most relevant ones.
5. You MAY: rewrite bullet points to use stronger action verbs and quantification — but only based on what the original bullet already says. Do not add numbers or metrics that aren't implied by the original.
6. You MAY: add relevant keywords from the job description into bullet points naturally — only if the underlying experience genuinely supports the keyword.
7. You MAY: rewrite the professional summary to align with the target role — using only the candidate's actual experience.
8. You MAY: reorder skill items within a category to put the most job-relevant skills first.
9. You MAY: add skills to the skills list ONLY if they are clearly evidenced in the candidate's experience bullets or projects.
10. Keep the tone professional and consistent throughout.
11. Prefer ATS-friendly wording: clear role terms, standard job titles, and explicit tools/skills already evidenced in the CV.

Return ONLY a valid JSON object matching the exact schema provided. No preamble, no explanation, no markdown fences.`;

  const userPrompt = `CANDIDATE'S CURRENT CV:
${JSON.stringify(cvData, null, 2)}

TARGET JOB:
Title: ${displayTitle}
Company: ${displayCompany}

Job Description:
${jobDescription}

Optimise the candidate's CV for this role. Return a JSON object with:
{
  "optimised_cv": { ...same schema as input CV... },
  "ai_changes_summary": "Concise human-readable summary of what was changed and why (2-4 sentences)",
  "keywords_added": ["keyword1", "keyword2"],
  "bullets_improved": <number of bullets rewritten>,
  "inferred_job_title": "If Title was not provided above, infer the role title from the job description; otherwise use the provided title.",
  "inferred_company_name": "If Company was not provided above, infer the employer name from the job description if clearly stated; otherwise null or a reasonable guess."
}`;

  const message = await withRetry(() =>
    claude.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })
  );

  const block = message.content[0];
  const rawText = block.type === 'text' ? block.text : '';
  const clean = rawText.replace(/```json|```/g, '').trim();

  let parsed: OptimisedCVResponse;
  try {
    parsed = JSON.parse(clean) as OptimisedCVResponse;
  } catch {
    console.error('Failed to parse AI response:', clean.slice(0, 500));
    throw new Error('AI_PARSE');
  }

  if (!parsed.optimised_cv) {
    throw new Error('AI_INCOMPLETE');
  }

  const { warnings } = validateOptimisedCV(cvData, parsed.optimised_cv);

  let extractedKeywords: string[] = [];
  try {
    const k = parsed.keywords_added;
    if (Array.isArray(k)) {
      extractedKeywords = k
        .filter((x): x is string => typeof x === 'string')
        .map((s) => s.trim())
        .filter(Boolean);
    }
  } catch {
    extractedKeywords = [];
  }

  const jobTitle: string | null = jobTitleInput
    ? jobTitleInput
    : parsed.inferred_job_title?.trim() || null;
  const companyName: string | null = companyInput
    ? companyInput
    : parsed.inferred_company_name?.trim() || null;

  const cvContent = JSON.stringify(parsed.optimised_cv);

  return {
    cvContent,
    extractedKeywords,
    jobTitle,
    companyName,
    ai_changes_summary: parsed.ai_changes_summary ?? '',
    bullets_improved: parsed.bullets_improved ?? 0,
    warnings,
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

    if (rateLimitHit(`optimise:${user.id}`)) {
      return NextResponse.json({ error: 'RATE_LIMIT' }, { status: 429 });
    }

    const body = (await request.json()) as {
      job_title?: string;
      company_name?: string;
      job_description?: string;
      core_cv_id?: string;
      generationType?: GenerationType;
      generation_type?: GenerationType;
      tone?: CoverLetterTone;
      length?: CoverLetterLength;
      specific_emphasis?: string;
      specificEmphasis?: string;
    };

    const generationType: GenerationType =
      body.generationType ?? body.generation_type ?? 'cv';

    if (generationType !== 'cv' && generationType !== 'coverLetter' && generationType !== 'both') {
      return NextResponse.json({ error: 'Invalid generationType' }, { status: 422 });
    }

    const needsJd =
      generationType === 'cv' ||
      generationType === 'coverLetter' ||
      generationType === 'both';
    if (needsJd) {
      const jd = body.job_description?.trim() ?? '';
      if (!jd || jd.length < 100) {
        return NextResponse.json(
          {
            error:
              'Please paste the full job description for best results.',
          },
          { status: 422 }
        );
      }
    }

    const jobTitleInput = body.job_title?.trim() ?? '';
    const companyInput = body.company_name?.trim() ?? '';
    const tone =
      body.tone && TONES.includes(body.tone) ? body.tone : 'professional';
    const length =
      body.length && LENGTHS.includes(body.length) ? body.length : 'medium';
    const emphasis =
      body.specific_emphasis?.trim() ?? body.specificEmphasis?.trim() ?? '';

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

    let cvRow: CvRow | null = null;
    let cvErr = null as { message: string } | null;
    if (body.core_cv_id) {
      const r = await supabase
        .from('cvs')
        .select('*')
        .eq('user_id', user.id)
        .eq('id', body.core_cv_id)
        .maybeSingle();
      cvErr = r.error;
      cvRow = r.data as CvRow | null;
    } else {
      const r = await supabase
        .from('cvs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(40);
      cvErr = r.error;
      const rows = (r.data ?? []) as CvRow[];
      cvRow =
        rows.find((row) => !Array.isArray(row.job_ids) || row.job_ids.length === 0) ??
        rows[0] ??
        null;
    }
    if (cvErr || !cvRow) {
      return NextResponse.json(
        { error: 'Please complete your CV profile before generating a job-specific version.' },
        { status: 422 }
      );
    }

    if (
      !cvRow.full_name?.trim() ||
      !Array.isArray(cvRow.experience) ||
      cvRow.experience.length < 1
    ) {
      return NextResponse.json(
        { error: 'Please complete your CV profile before generating a job-specific version.' },
        { status: 422 }
      );
    }

    const cvData = rowToCvData(cvRow);
    const jobDescription = (body.job_description ?? '').trim();
    const clProfile = cvRow as unknown as Partial<CVProfile>;
    const candidateNameFromCv = cvRow.full_name?.trim() || null;

    const companyForCl = companyInput || 'the company';
    const titleForCl = jobTitleInput || 'the role';

    const basePayload = {
      generationType,
      coverLetterTone: tone,
      coverLetterLength: length,
    };

    if (generationType === 'coverLetter') {
      const coverLetter = await generateCoverLetterText({
        cvProfile: clProfile,
        jobDescription,
        companyName: companyForCl,
        jobTitle: titleForCl,
        tone,
        length,
        specificEmphasis: emphasis,
        candidateNameFromCv,
      });
      return NextResponse.json({
        ...basePayload,
        coverLetter,
        cv: undefined,
        cvContent: undefined,
      });
    }

    if (generationType === 'both') {
      try {
        const [cvPart, coverLetter] = await Promise.all([
          generateOptimisedCvJson({
            cvData,
            jobDescription,
            jobTitleInput,
            companyInput,
          }),
          generateCoverLetterText({
            cvProfile: clProfile,
            jobDescription,
            companyName: companyForCl,
            jobTitle: titleForCl,
            tone,
            length,
            specificEmphasis: emphasis,
            candidateNameFromCv,
          }),
        ]);

        return NextResponse.json({
          ...basePayload,
          cv: cvPart.cvContent,
          cvContent: cvPart.cvContent,
          coverLetter,
          extractedKeywords: cvPart.extractedKeywords,
          jobTitle: cvPart.jobTitle,
          companyName: cvPart.companyName,
          ai_changes_summary: cvPart.ai_changes_summary,
          bullets_improved: cvPart.bullets_improved,
          warnings: cvPart.warnings,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : '';
        if (msg === 'AI_PARSE') {
          return NextResponse.json(
            { error: 'AI returned invalid response. Please try again.' },
            { status: 502 }
          );
        }
        if (msg === 'AI_INCOMPLETE') {
          return NextResponse.json(
            { error: 'AI returned incomplete response. Please try again.' },
            { status: 502 }
          );
        }
        throw e;
      }
    }

    // generationType === 'cv'
    try {
      const cvPart = await generateOptimisedCvJson({
        cvData,
        jobDescription,
        jobTitleInput,
        companyInput,
      });
      return NextResponse.json({
        ...basePayload,
        cv: cvPart.cvContent,
        cvContent: cvPart.cvContent,
        extractedKeywords: cvPart.extractedKeywords,
        jobTitle: cvPart.jobTitle,
        companyName: cvPart.companyName,
        ai_changes_summary: cvPart.ai_changes_summary,
        bullets_improved: cvPart.bullets_improved,
        warnings: cvPart.warnings,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'AI_PARSE') {
        return NextResponse.json(
          { error: 'AI returned invalid response. Please try again.' },
          { status: 502 }
        );
      }
      if (msg === 'AI_INCOMPLETE') {
        return NextResponse.json(
          { error: 'AI returned incomplete response. Please try again.' },
          { status: 502 }
        );
      }
      throw e;
    }
  } catch (e) {
    console.error('cv optimise', e);
    return NextResponse.json(
      { error: 'generation_failed' },
      { status: 500 }
    );
  }
}
