import Anthropic from '@anthropic-ai/sdk';
import type {
  CoverLetterLength,
  CoverLetterTone,
  CVProfile,
} from '@/types';

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
export const CLAUDE_MODEL = 'claude-sonnet-4-20250514';

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
  rawText: string
): Promise<Partial<CVProfile>> {
  const message = await withRetry(() =>
    claude.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      system: `You are a CV parsing expert. Extract structured information from the provided CV text and return ONLY valid JSON with no other text. The JSON must match the exact schema provided.`,
      messages: [
        {
          role: 'user',
          content: `Extract the following structured data from this CV. Return ONLY valid JSON with no preamble or markdown.\n\nSchema:\n{\n  "full_name": string,\n  "professional_title": string,\n  "email": string,\n  "phone": string,\n  "location": string,\n  "linkedin_url": string | null,\n  "portfolio_url": string | null,\n  "website_url": string | null,\n  "summary": string,\n  "experience": [{"id":"uuid","company":"","title":"","location":"","start_date":"YYYY-MM","end_date":"YYYY-MM or null","is_current":false,"bullets":[],"description":""}],\n  "education": [{"id":"uuid","institution":"","degree":"","field_of_study":"","start_date":"YYYY-MM","end_date":"YYYY-MM or null","gpa":null,"description":""}],\n  "skills": [{"id":"uuid","category":"technical|soft|languages|tools","items":[]}],\n  "projects": [{"id":"uuid","name":"","description":"","tech_stack":[],"url":null,"start_date":null,"end_date":null}],\n  "certifications": [{"id":"uuid","name":"","issuer":"","issue_date":"YYYY-MM","expiry_date":null,"url":null}],\n  "languages": [{"id":"uuid","language":"","proficiency":"native|fluent|advanced|intermediate|basic"}],\n  "awards": [{"id":"uuid","title":"","issuer":"","date":"YYYY-MM","description":""}]\n}\n\nCV TEXT:\n${rawText}`,
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
}) {
  const wordTargets = { short: 200, medium: 350, long: 500 };
  const experienceText = (params.cvProfile.experience || [])
    .map(
      (e) =>
        `${e.title} at ${e.company} (${e.start_date}–${e.is_current ? 'Present' : e.end_date})\n${e.bullets.join('\n')}`
    )
    .join('\n\n');
  const skillsText = (params.cvProfile.skills || [])
    .flatMap((s) => s.items)
    .join(', ');
  const projectsText = (params.cvProfile.projects || [])
    .map((p) => `${p.name}: ${p.description}`)
    .join('\n');

  return claude.messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: 1000,
    system:
      'You are a professional career coach and expert cover letter writer. Write compelling, tailored, authentic cover letters. Return only the cover letter body text — no subject line, no "Dear Hiring Manager" header, no sign-off. Those are handled by the template.',
    messages: [
      {
        role: 'user',
        content: `CANDIDATE PROFILE:\nName: ${params.cvProfile.full_name}\nTitle: ${params.cvProfile.professional_title}\nSummary: ${params.cvProfile.summary}\n\nWork Experience:\n${experienceText}\n\nKey Skills: ${skillsText}\n\nNotable Projects: ${projectsText}\n\n---\n\nJOB DESCRIPTION:\n${params.jobDescription}\n\n---\n\nINSTRUCTIONS:\n- Company: ${params.companyName}\n- Job Title: ${params.jobTitle}\n- Tone: ${params.tone} (professional=formal but warm; confident=assertive,direct; creative=engaging; concise=brief,punchy; formal=traditional)\n- Target length: ~${wordTargets[params.length]} words\n- Special emphasis: ${params.specificEmphasis || 'None'}\n\nWrite the cover letter body now.`,
      },
    ],
  });
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
