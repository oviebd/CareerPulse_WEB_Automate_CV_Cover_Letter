import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CLAUDE_MODEL } from '@/lib/claude';
import { rateLimitHit } from '@/lib/rate-limit';
import { resolveEffectiveTier } from '@/lib/dev-subscription';
import { canAccessFeature } from '@/lib/subscription';
import Anthropic from '@anthropic-ai/sdk';
import type { CVData } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 120;

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
    if (opt && (opt.company !== orig.company || opt.title !== orig.title)) {
      warnings.push(`AI changed company/title for ${orig.company} — reverted`);
      optimised.experience[i].company = orig.company;
      optimised.experience[i].title = orig.title;
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
      (opt.start_date !== orig.start_date || opt.end_date !== orig.end_date)
    ) {
      optimised.experience[i].start_date = orig.start_date;
      optimised.experience[i].end_date = orig.end_date;
      optimised.experience[i].is_current = orig.is_current;
    }
  });

  return { valid: warnings.length === 0, warnings };
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
    };

    if (!body.job_description?.trim() || body.job_description.trim().length < 100) {
      return NextResponse.json(
        {
          error:
            'Please paste the full job description for best results.',
        },
        { status: 422 }
      );
    }

    if (!body.job_title?.trim() || !body.company_name?.trim()) {
      return NextResponse.json(
        { error: 'Job title and company name are required.' },
        { status: 422 }
      );
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

    const { data: cvRow, error: cvErr } = body.core_cv_id
      ? await supabase
          .from('cv_profiles')
          .select('*')
          .eq('user_id', user.id)
          .eq('id', body.core_cv_id)
          .maybeSingle()
      : await supabase
          .from('cv_profiles')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
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

    const cvData: CVData = {
      full_name: cvRow.full_name ?? null,
      professional_title: cvRow.professional_title ?? null,
      email: cvRow.email ?? null,
      phone: cvRow.phone ?? null,
      location: cvRow.location ?? null,
      linkedin_url: cvRow.linkedin_url ?? null,
      github_url: cvRow.github_url ?? null,
      links: cvRow.links ?? [],
      address: cvRow.address ?? null,
      photo_url: cvRow.photo_url ?? null,
      summary: cvRow.summary ?? null,
      experience: cvRow.experience ?? [],
      education: cvRow.education ?? [],
      skills: cvRow.skills ?? [],
      projects: cvRow.projects ?? [],
      certifications: cvRow.certifications ?? [],
      languages: cvRow.languages ?? [],
      awards: cvRow.awards ?? [],
      referrals: cvRow.referrals ?? [],
    };

    const jobDescription = body.job_description.trim();
    const jobTitle = body.job_title.trim();
    const companyName = body.company_name.trim();

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
Title: ${jobTitle}
Company: ${companyName}

Job Description:
${jobDescription}

Optimise the candidate's CV for this role. Return a JSON object with:
{
  "optimised_cv": { ...same schema as input CV... },
  "ai_changes_summary": "Concise human-readable summary of what was changed and why (2-4 sentences)",
  "keywords_added": ["keyword1", "keyword2"],
  "bullets_improved": <number of bullets rewritten>
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
      return NextResponse.json(
        { error: 'AI returned invalid response. Please try again.' },
        { status: 502 }
      );
    }

    if (!parsed.optimised_cv) {
      return NextResponse.json(
        { error: 'AI returned incomplete response. Please try again.' },
        { status: 502 }
      );
    }

    const { warnings } = validateOptimisedCV(cvData, parsed.optimised_cv);

    return NextResponse.json({
      optimised_cv: parsed.optimised_cv,
      ai_changes_summary: parsed.ai_changes_summary ?? '',
      keywords_added: parsed.keywords_added ?? [],
      bullets_improved: parsed.bullets_improved ?? 0,
      resolved_job_title: jobTitle,
      resolved_company_name: companyName,
      warnings,
    });
  } catch (e) {
    console.error('cv optimise', e);
    return NextResponse.json(
      { error: 'generation_failed' },
      { status: 500 }
    );
  }
}
