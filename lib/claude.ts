import type {
  CoverLetterLength,
  CoverLetterTone,
  CVProfile,
  ExtractedCoverLetter,
} from '@/types';
import { parseClaudeJson } from '@/lib/parse-claude-json';
import {
  CLAUDE_MODEL,
  claudeComplete,
  getAnthropicClient,
} from '@/lib/ai/anthropic-gateway';

export type { ExtractedCoverLetter };
export { CLAUDE_MODEL };

const claude = getAnthropicClient();

const MAX_CV_TEXT_CHARS = 60_000;

export function describeAnthropicError(err: unknown): string {
  if (err instanceof Error && err.message) {
    return err.message.slice(0, 240);
  }
  if (!err || typeof err !== 'object') return 'unknown';
  const o = err as {
    status?: number;
    message?: string;
    error?: { type?: string; message?: string };
  };
  if (o.error?.message) {
    const type = o.error.type ?? 'api_error';
    return `${type}: ${o.error.message}`.slice(0, 240);
  }
  if (o.message) return o.message.slice(0, 240);
  if (typeof o.status === 'number') return `http_${o.status}`;
  return 'unknown';
}

export async function checkAnthropicConnectivity(): Promise<{
  ok: boolean;
  detail?: string;
}> {
  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    return { ok: false, detail: 'not_set' };
  }
  try {
    await claude.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 16,
      messages: [{ role: 'user', content: 'Reply with OK only.' }],
    });
    return { ok: true };
  } catch (e) {
    console.error('health: anthropic check failed', e);
    return { ok: false, detail: describeAnthropicError(e) };
  }
}

function truncateCvText(text: string): string {
  if (text.length <= MAX_CV_TEXT_CHARS) return text;
  return `${text.slice(0, MAX_CV_TEXT_CHARS)}\n\n[TRUNCATED — document exceeded ${MAX_CV_TEXT_CHARS} characters]`;
}

export async function extractCVFromText(
  rawText: string,
  embeddedHyperlinks?: string
): Promise<Partial<CVProfile>> {
  const hyperlinkSection = embeddedHyperlinks?.trim()
    ? `\n\n${embeddedHyperlinks}`
    : '';
  const cvText = truncateCvText(rawText);

  const system = `You are a CV parsing expert. Extract structured information from the provided CV text and return ONLY valid JSON with no other text. The JSON must match the exact schema provided.

IMPORTANT — Link extraction rules:
• CVs often contain hyperlinks (clickable text) whose destination URL is NOT visible in the plain text.  An "EMBEDDED HYPERLINKS" section at the end lists these hidden links.  Use them to populate the correct fields.
• Profile-level links:
  - linkedin.com → "linkedin_url" (dedicated field, NOT in links[])
  - github.com → "github_url" (dedicated field, NOT in links[])
  - Everything else (portfolio, website, Behance, Dribbble, Twitter/X, blog, npm, etc.) → add to "links[]" with an appropriate label
• Project links: for EACH project, collect ALL matching hyperlinks into that project's "links[]" array.
  - Use descriptive labels: "GitHub", "Live Demo", "npm", "PyPI", "Documentation", "Video", "Slides", "Paper", etc.
  - A single project may have multiple links (e.g. repo + live demo).
• Certification links: for EACH certification, collect ALL credential/badge/verification links into that cert's "links[]" array.
  - Common labels: "Credential", "Badge", "Verify", "Certificate"
• Also scan the visible text for bare URLs (e.g. "github.com/user/repo") and classify them the same way.
• Do NOT duplicate a link across both dedicated fields and links[].

IMPORTANT — Skills extraction rules:
• Only extract skills that are explicitly listed on the CV (skills section or clear skill/tool lists). Do NOT invent skills from every technology mention in experience bullets.
• Prefer technical skills, tools, and spoken/programming languages. Omit vague soft skills (e.g. "team player", "hard working", "communication") unless the CV has a dedicated soft-skills list.
• At most 15 skill items total across all categories. Prefer quality over volume; dedupe case-insensitively.
• Use short category names (Technical, Tools, Languages, Soft). At most 4 categories.`;

  const userContent = `Extract the following structured data from this CV. Return ONLY valid JSON with no preamble or markdown.

Schema:
{
  "full_name": string,
  "professional_title": string,
  "email": string,
  "phone": string,
  "location": string,
  "linkedin_url": string | null,
  "github_url": string | null,
  "links": [{"id":"uuid","label":"Portfolio|Website|Behance|Dribbble|Twitter|Blog|npm|...","url":""}],
  "summary": string,
  "experience": [{"id":"uuid","company":"","title":"","location":"","start_date":"YYYY-MM","end_date":"YYYY-MM or null","is_current":false,"bullets":[],"description":""}],
  "education": [{"id":"uuid","institution":"","degree":"","field_of_study":"","start_date":"YYYY-MM","end_date":"YYYY-MM or null","gpa":null,"description":""}],
  "skills": [{"id":"uuid","category":"Technical|Tools|Languages|Soft","items":[{"id":"uuid","name":"","rating":3}]}],
  "projects": [{"id":"uuid","name":"","description":"","tech_stack":[],"links":[{"label":"GitHub|Live Demo|npm|...","url":""}],"start_date":null,"end_date":null}],
  "certifications": [{"id":"uuid","name":"","issuer":"","issue_date":"YYYY-MM","expiry_date":null,"links":[{"label":"Credential|Badge|Verify|...","url":""}]}],
  "languages": [{"id":"uuid","language":"","proficiency":"native|fluent|advanced|intermediate|basic"}],
  "awards": [{"id":"uuid","title":"","issuer":"","date":"YYYY-MM","description":""}]
}

CV TEXT:
${cvText}${hyperlinkSection}`;

  const { text } = await claudeComplete({
    system,
    user: userContent,
    maxTokens: 8192,
    category: 'cv_creation',
    operation: 'extract',
  });
  if (!text.trim()) {
    throw new Error('empty_model_response');
  }
  return parseClaudeJson<Partial<CVProfile>>(text);
}

export function generateCoverLetterStream(params: {
  cvProfile: Partial<CVProfile>;
  jobDescription: string;
  companyName: string;
  jobTitle: string;
  tone: CoverLetterTone;
  length: CoverLetterLength;
  specificEmphasis: string;
  candidateNameFromCv?: string | null;
}) {
  const wordTargets = { short: 200, medium: 350, long: 500 };
  const userContent = buildCoverLetterUserContent(params, wordTargets);
  return claude.messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: 1000,
    system:
      'You are a professional career coach and expert cover letter writer. Write compelling, tailored, authentic, ATS-optimized cover letters. Return only the cover letter body text — no subject line, no "Dear Hiring Manager" header, no sign-off. Those are handled by the template. Never fabricate facts, achievements, tools, or metrics.',
    messages: [
      {
        role: 'user',
        content: userContent,
      },
    ],
  });
}

function buildCoverLetterUserContent(
  params: {
    cvProfile: Partial<CVProfile>;
    jobDescription: string;
    companyName: string;
    jobTitle: string;
    tone: CoverLetterTone;
    length: CoverLetterLength;
    specificEmphasis: string;
    /** From `cvs.full_name` for this generation — overrides `cvProfile.full_name` when set */
    candidateNameFromCv?: string | null;
  },
  wordTargets: Record<CoverLetterLength, number>
): string {
  const trimmedFromRow = params.candidateNameFromCv?.trim();
  const trimmedFromProfile = params.cvProfile.full_name?.trim();
  const candidateLabel =
    trimmedFromRow || trimmedFromProfile || 'the candidate';

  const experienceText = (params.cvProfile.experience || [])
    .map(
      (e) =>
        `${e.title} at ${e.company} (${e.start_date}–${e.is_current ? 'Present' : e.end_date})\n${(e.bullets ?? []).join('\n')}`
    )
    .join('\n\n');
  const skillsText = (params.cvProfile.skills || [])
    .flatMap((s) => s.items ?? [])
    .map((it) =>
      typeof it === 'string' ? it : `${it.name}${typeof it.rating === 'number' ? ` (${it.rating})` : ''}`
    )
    .join(', ');
  const projectsText = (params.cvProfile.projects || [])
    .map((p) => `${p.name}: ${p.description ?? ''}`)
    .join('\n');

  return `CANDIDATE PROFILE:\nCandidate name (from CV record): ${candidateLabel}\nProfessional title: ${params.cvProfile.professional_title ?? ''}\nSummary: ${params.cvProfile.summary ?? ''}\n\nWork Experience:\n${experienceText}\n\nKey Skills: ${skillsText}\n\nNotable Projects: ${projectsText}\n\n---\n\nJOB DESCRIPTION:\n${params.jobDescription}\n\n---\n\nINSTRUCTIONS:\n- Company: ${params.companyName}\n- Job Title: ${params.jobTitle}\n- Tone: ${params.tone} (professional=formal but warm; confident=assertive,direct; creative=engaging; concise=brief,punchy; formal=traditional)\n- Target length: ~${wordTargets[params.length]} words\n- Special emphasis: ${params.specificEmphasis || 'None'}\n- Write in the first person as this candidate. Use the candidate name above for any self-reference; if it is "the candidate", write naturally without a proper name.\n- Maximize ATS relevance as much as possible using clear, role-relevant wording from the job description and candidate profile.\n- Use only evidence present in the candidate profile. Do not invent achievements, responsibilities, technologies, or numbers.\n\nWrite the cover letter body now.`;
}

/** Non-streaming cover letter body (same prompt as `generateCoverLetterStream`). */
export async function generateCoverLetterText(params: {
  cvProfile: Partial<CVProfile>;
  jobDescription: string;
  companyName: string;
  jobTitle: string;
  tone: CoverLetterTone;
  length: CoverLetterLength;
  specificEmphasis: string;
  candidateNameFromCv?: string | null;
}): Promise<string> {
  const wordTargets = { short: 200, medium: 350, long: 500 };
  const userContent = buildCoverLetterUserContent(params, wordTargets);
  const system =
    'You are a professional career coach and expert cover letter writer. Write compelling, tailored, authentic, ATS-optimized cover letters. Return only the cover letter body text — no subject line, no "Dear Hiring Manager" header, no sign-off. Those are handled by the template. Never fabricate facts, achievements, tools, or metrics.';
  const { text: output } = await claudeComplete({
    system,
    user: userContent,
    maxTokens: 1000,
    category: 'cover_letter',
    operation: 'generate',
  });
  return output.trim();
}

/**
 * Parse an uploaded cover letter document into body text + optional contact/role fields.
 * Strips letterhead / salutation / sign-off so templates can render them.
 */
export async function extractCoverLetterFromText(
  rawText: string
): Promise<ExtractedCoverLetter> {
  const letterText = truncateCvText(rawText);
  const system = `You are a cover letter parsing expert. Extract structured fields from an uploaded cover letter and return ONLY valid JSON with no other text.

Rules:
• "content" must be the letter BODY only — strip letterhead (name/address/contact block at top), date, recipient address, salutation (e.g. "Dear …"), and sign-off/closing (e.g. "Sincerely," + name). Preserve paragraph breaks as newlines.
• If a field is not present, use null.
• Do not invent contact details or role/company names.`;
  const userContent = `Extract from this cover letter. Return ONLY JSON:

{
  "content": string,
  "applicant_name": string | null,
  "applicant_role": string | null,
  "applicant_email": string | null,
  "applicant_phone": string | null,
  "applicant_location": string | null,
  "company_name": string | null,
  "job_title": string | null
}

COVER LETTER TEXT:
${letterText}`;
  const { text } = await claudeComplete({
    system,
    user: userContent,
    maxTokens: 4096,
    category: 'cover_letter',
    operation: 'extract',
  });
  if (!text.trim()) {
    throw new Error('empty_model_response');
  }
  const parsed = parseClaudeJson<Partial<ExtractedCoverLetter>>(text);
  const content =
    typeof parsed.content === 'string' ? parsed.content.trim() : '';
  if (!content) {
    throw new Error('empty_cover_letter_body');
  }
  const strOrNull = (v: unknown): string | null =>
    typeof v === 'string' && v.trim() ? v.trim() : null;
  return {
    content,
    applicant_name: strOrNull(parsed.applicant_name),
    applicant_role: strOrNull(parsed.applicant_role),
    applicant_email: strOrNull(parsed.applicant_email),
    applicant_phone: strOrNull(parsed.applicant_phone),
    applicant_location: strOrNull(parsed.applicant_location),
    company_name: strOrNull(parsed.company_name),
    job_title: strOrNull(parsed.job_title),
  };
}

/** Rewrite/enhance an existing cover letter body, preserving the candidate's voice. */
export async function enhanceCoverLetter(params: {
  existingContent: string;
  targetRole?: string;
  targetCompany?: string;
  tone?: CoverLetterTone;
  length?: CoverLetterLength;
  specificEmphasis?: string;
}): Promise<string> {
  const wordTargets = { short: 200, medium: 350, long: 500 };
  const toneGuide: Record<CoverLetterTone, string> =
    {
      professional: 'formal but warm',
      confident: 'assertive and direct',
      creative: 'engaging and distinctive',
      concise: 'brief and punchy',
      formal: 'traditional and structured',
    };
  const tone = params.tone ?? 'professional';
  const length = params.length ?? 'medium';
  const targetWords = wordTargets[length];
  const toneDesc = toneGuide[tone];
  const roleContext = params.targetRole
    ? `Target role: ${params.targetRole}`
    : '';
  const companyContext = params.targetCompany
    ? `Target company: ${params.targetCompany}`
    : '';
  const emphasisContext = params.specificEmphasis?.trim()
    ? `Special emphasis: ${params.specificEmphasis}`
    : '';
  const contextLines = [roleContext, companyContext, emphasisContext]
    .filter(Boolean)
    .join('\n');

  const system =
    'You are an expert cover letter coach. Rewrite and improve the provided cover letter body. Preserve the candidate\'s authentic experiences, achievements, and personal voice. Improve clarity, professional impact, sentence flow, and ATS keyword coverage. Return ONLY the improved body text — no salutation header, no sign-off, no preamble or commentary.';
  const userContent = `EXISTING COVER LETTER:\n${params.existingContent}\n\n---\n\nINSTRUCTIONS:\n- Tone: ${tone} (${toneDesc})\n- Target length: ~${targetWords} words\n${contextLines}\n- Preserve all real achievements, facts, and the candidate's unique voice\n- Improve sentence structure, impact, and ATS alignment\n- Do NOT invent new achievements or metrics\n\nWrite the improved cover letter body now.`;
  const { text: output } = await claudeComplete({
    system,
    user: userContent,
    maxTokens: 1000,
    category: 'cover_letter',
    operation: 'enhance',
  });
  return output.trim();
}

export async function scoreATS(
  jobDescription: string,
  coverLetter: string
): Promise<{
  score: number;
  keywords_found: string[];
  keywords_missing: string[];
  summary: string;
}> {
  const system =
    'You are an ATS expert. Analyze a cover letter against a job description and return ONLY valid JSON, no other text.';
  const userContent = `JOB DESCRIPTION:\n${jobDescription}\n\nCOVER LETTER:\n${coverLetter}\n\nReturn this JSON exactly:\n{"score": number (0-100), "keywords_found": [string], "keywords_missing": [string], "summary": string}`;
  const { text } = await claudeComplete({
    system,
    user: userContent,
    maxTokens: 500,
    category: 'cover_letter',
    operation: 'score_ats',
  });
  return JSON.parse(text.replace(/```json|```/g, '').trim()) as {
    score: number;
    keywords_found: string[];
    keywords_missing: string[];
    summary: string;
  };
}

export async function claudeTextCompletion(
  system: string,
  user: string,
  maxTokens = 1024,
  operation = 'completion',
  options?: { skipBilling?: boolean }
): Promise<string> {
  const { text: output } = await claudeComplete({
    system,
    user,
    maxTokens,
    category: 'ai_suggestions',
    operation,
    skipBilling: options?.skipBilling,
  });
  return output;
}

export async function claudeTextCompletionWithMetrics(
  system: string,
  user: string,
  maxTokens = 1024,
  operation = 'completion',
  options?: { skipBilling?: boolean }
): Promise<{
  text: string;
  inputTokens: number;
  outputTokens: number;
  aiUsageId?: string | null;
}> {
  const result = await claudeComplete({
    system,
    user,
    maxTokens,
    category: 'ai_suggestions',
    operation,
    skipBilling: options?.skipBilling,
  });
  return {
    text: result.text,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    aiUsageId: result.aiUsageId ?? null,
  };
}
