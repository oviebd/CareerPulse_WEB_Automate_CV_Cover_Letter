import Anthropic from '@anthropic-ai/sdk';
import type {
  CoverLetterLength,
  CoverLetterTone,
  CVProfile,
} from '@/types';

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
export const CLAUDE_MODEL =
  process.env.ANTHROPIC_MODEL?.trim() || 'claude-sonnet-4-20250514';

function isRetryable(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const o = err as { status?: number; type?: string };
  return o.status === 429 || o.type === 'overloaded_error';
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 30000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      if (!isRetryable(err) || attempt === maxRetries - 1) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error('Max retries exceeded');
}

export async function extractCVFromText(
  rawText: string,
  embeddedHyperlinks?: string
): Promise<Partial<CVProfile>> {
  const hyperlinkSection = embeddedHyperlinks?.trim()
    ? `\n\n${embeddedHyperlinks}`
    : '';

  const message = await withRetry(() =>
    claude.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      system: `You are a CV parsing expert. Extract structured information from the provided CV text and return ONLY valid JSON with no other text. The JSON must match the exact schema provided.

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
• Do NOT duplicate a link across both dedicated fields and links[].`,
      messages: [
        {
          role: 'user',
          content: `Extract the following structured data from this CV. Return ONLY valid JSON with no preamble or markdown.

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
  "skills": [{"id":"uuid","category":"technical|soft|languages|tools","items":[]}],
  "projects": [{"id":"uuid","name":"","description":"","tech_stack":[],"links":[{"label":"GitHub|Live Demo|npm|...","url":""}],"start_date":null,"end_date":null}],
  "certifications": [{"id":"uuid","name":"","issuer":"","issue_date":"YYYY-MM","expiry_date":null,"links":[{"label":"Credential|Badge|Verify|...","url":""}]}],
  "languages": [{"id":"uuid","language":"","proficiency":"native|fluent|advanced|intermediate|basic"}],
  "awards": [{"id":"uuid","title":"","issuer":"","date":"YYYY-MM","description":""}]
}

CV TEXT:
${rawText}${hyperlinkSection}`,
        },
      ],
    })
  );
  const block = message.content[0];
  const text = block.type === 'text' ? block.text : '';
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean) as Partial<CVProfile>;
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
  const message = await withRetry(() =>
    claude.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1000,
      system:
        'You are a professional career coach and expert cover letter writer. Write compelling, tailored, authentic, ATS-optimized cover letters. Return only the cover letter body text — no subject line, no "Dear Hiring Manager" header, no sign-off. Those are handled by the template. Never fabricate facts, achievements, tools, or metrics.',
      messages: [{ role: 'user', content: userContent }],
    })
  );
  const block = message.content[0];
  return block.type === 'text' ? block.text.trim() : '';
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
  const message = await withRetry(() =>
    claude.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 500,
      system:
        'You are an ATS expert. Analyze a cover letter against a job description and return ONLY valid JSON, no other text.',
      messages: [
        {
          role: 'user',
          content: `JOB DESCRIPTION:\n${jobDescription}\n\nCOVER LETTER:\n${coverLetter}\n\nReturn this JSON exactly:\n{"score": number (0-100), "keywords_found": [string], "keywords_missing": [string], "summary": string}`,
        },
      ],
    })
  );
  const block = message.content[0];
  const text = block.type === 'text' ? block.text : '{}';
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
  maxTokens = 1024
): Promise<string> {
  const message = await withRetry(() =>
    claude.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    })
  );
  const block = message.content[0];
  return block.type === 'text' ? block.text : '';
}
