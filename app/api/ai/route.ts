import { NextResponse } from 'next/server';
import { claudeTextCompletion } from '@/lib/claude';
import {
  getJdAnalyzeCountThisMonth,
  incrementJdAnalyze,
} from '@/lib/jd-monthly-limit';
import { resolveEffectiveTier } from '@/lib/dev-subscription';
import { canAccessFeature } from '@/lib/subscription';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

type Tool =
  | 'jd_analyze'
  | 'linkedin_summary'
  | 'cold_email'
  | 'bullet_improve'
  | 'interview_questions'
  | 'cv_rewrite_suggestions';

function looksLikeCompleteSentence(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length < 4) return false;
  if (!/[.!?]$/.test(t)) return false;
  const lower = t.toLowerCase();
  if (/[,:;]\s*$/.test(t)) return false;
  if (/\b(and|or|but|with|for|to|of|in|on|at|by)\s*[.!?]$/i.test(t)) return false;
  if (lower.includes('...')) return false;
  return true;
}

function normalizeParagraphSpacing(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function clampWords(text: string, maxWords: number): string {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text.trim();
  return words.slice(0, maxWords).join(' ').trim();
}

function enforceCoverLetterParagraphs(text: string): string {
  const normalized = normalizeParagraphSpacing(text);
  if (!normalized) return normalized;
  if (normalized.includes('\n\n')) return normalized;
  const sentences = normalized.match(/[^.!?]+[.!?]+/g)?.map((s) => s.trim()) ?? [normalized];
  if (sentences.length <= 2) return normalized;
  const splitAt = Math.ceil(sentences.length / 2);
  const first = sentences.slice(0, splitAt).join(' ').trim();
  const second = sentences.slice(splitAt).join(' ').trim();
  return `${first}\n\n${second}`.trim();
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();
    const tier = resolveEffectiveTier(profile?.subscription_tier);

    const body = (await request.json()) as {
      tool?: Tool;
      payload?: Record<string, string | string[]>;
    };
    const tool = body.tool;
    const payload = body.payload ?? {};

    if (!tool) {
      return NextResponse.json({ error: 'tool_required' }, { status: 400 });
    }

    if (tool === 'jd_analyze') {
      const jd = payload.jobDescription ?? '';
      if (!jd.trim()) {
        return NextResponse.json({ error: 'job_description_required' }, { status: 400 });
      }
      if (
        !canAccessFeature(tier, 'aiExtrasAccess') &&
        getJdAnalyzeCountThisMonth(user.id) >= 3
      ) {
        return NextResponse.json({ error: 'JD_ANALYZE_LIMIT' }, { status: 402 });
      }
      const text = await claudeTextCompletion(
        'Return ONLY valid JSON. No markdown.',
        `Analyze this job description and return JSON: {"seniority":"string","role_type":"string","required_skills":["string"],"red_flags":["string"],"summary":"string"}\n\nJOB:\n${jd}`,
        800
      );
      const clean = text.replace(/```json|```/g, '').trim();
      if (!canAccessFeature(tier, 'aiExtrasAccess')) {
        incrementJdAnalyze(user.id);
      }
      return NextResponse.json({ result: JSON.parse(clean) });
    }

    if (tool === 'linkedin_summary') {
      if (!canAccessFeature(tier, 'aiExtrasAccess')) {
        return NextResponse.json({ error: 'upgrade_required' }, { status: 402 });
      }
      const current = payload.text ?? '';
      const out = await claudeTextCompletion(
        'You rewrite LinkedIn summaries. Return only the new summary text.',
        `Rewrite for clarity and impact (max 2600 chars):\n${current}`,
        600
      );
      return NextResponse.json({ result: out.trim() });
    }

    if (tool === 'cold_email') {
      if (!canAccessFeature(tier, 'aiExtrasAccess')) {
        return NextResponse.json({ error: 'upgrade_required' }, { status: 402 });
      }
      const ctx = payload.context ?? '';
      const out = await claudeTextCompletion(
        'Return JSON with keys professional, friendly, concise — each a cold outreach email body.',
        `Context: ${ctx}`,
        1200
      );
      const clean = out.replace(/```json|```/g, '').trim();
      return NextResponse.json({ result: JSON.parse(clean) });
    }

    if (tool === 'bullet_improve') {
      if (!canAccessFeature(tier, 'aiExtrasAccess')) {
        return NextResponse.json({ error: 'upgrade_required' }, { status: 402 });
      }
      const bullet = payload.bullet ?? '';
      const out = await claudeTextCompletion(
        'Return JSON {"before":"","after":""} with improved resume bullet using metrics.',
        `Bullet: ${bullet}`,
        400
      );
      const clean = out.replace(/```json|```/g, '').trim();
      return NextResponse.json({ result: JSON.parse(clean) });
    }

    if (tool === 'interview_questions') {
      const needPremium = !['premium', 'career'].includes(tier);
      if (needPremium) {
        return NextResponse.json({ error: 'upgrade_required' }, { status: 402 });
      }
      const jd = payload.jobDescription ?? '';
      const out = await claudeTextCompletion(
        'Return ONLY JSON: {"behavioral":[],"technical":[],"questions_to_ask":[]}',
        `Generate interview prep for:\n${jd}`,
        1200
      );
      const clean = out.replace(/```json|```/g, '').trim();
      return NextResponse.json({ result: JSON.parse(clean) });
    }

    if (tool === 'cv_rewrite_suggestions') {
      if (!canAccessFeature(tier, 'aiExtrasAccess')) {
        return NextResponse.json({ error: 'upgrade_required' }, { status: 402 });
      }
      const section = payload.section ?? 'CV section';
      const inputLabel = payload.input_label ?? 'field';
      const text = payload.text ?? '';
      const tone =
        typeof payload.tone === 'string' && payload.tone.trim()
          ? payload.tone.trim()
          : 'professional';
      const tonesRaw = payload.tones;
      const tones =
        Array.isArray(tonesRaw) && tonesRaw.length
          ? tonesRaw.filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
          : tone
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean);
      const wordLimitRaw = Number(payload.word_limit ?? payload.char_limit ?? '100');
      const wordLimit = Number.isFinite(wordLimitRaw)
        ? Math.min(500, Math.max(5, Math.round(wordLimitRaw)))
        : 100;
      const context = payload.context ?? '';

      if (!text.trim()) {
        return NextResponse.json({ error: 'text_required' }, { status: 400 });
      }

      const isCoverLetterRequest =
        /cover\s*letter/i.test(section) || /cover\s*letter/i.test(inputLabel);

      const basePrompt = `Rewrite content for a CV section.
Section: ${section}
Input label: ${inputLabel}
Tone style: ${tones.join(', ') || 'professional'}
Maximum words per suggestion: ${wordLimit}
Extra context: ${context || 'N/A'}

Current text:
${text}

Return strict JSON exactly like:
{
  "suggestions":[
    {"text":"...", "tone":"...", "why":"..."},
    {"text":"...", "tone":"...", "why":"..."},
    {"text":"...", "tone":"...", "why":"..."}
  ],
  "best_index": 0,
  "best_reason":"..."
}

Rules:
- Exactly 3 suggestions.
- Each suggestion must be specific to the provided section and input label.
- Keep each suggestion at or under ${wordLimit} words.
- Do not fabricate facts; only rewrite existing meaning more clearly.
- "tone" must be a short label matching the applied style.
- "why" must be one concise sentence explaining the strength.
- "best_index" must be 0, 1, or 2.
- "best_reason" must explain which final suggestion to use and why.
- Every suggestion must be a complete, meaningful sentence (not a fragment).
- Every suggestion must end with "." or "!" or "?".
- Keep formatting appropriate to field type:
  - Cover letters / long text: preserve natural paragraph structure (2-4 paragraphs when useful).
  - Summary/short fields: keep concise single paragraph unless line breaks are clearly better.
${isCoverLetterRequest
  ? `- This is a cover letter rewrite request. Write each suggestion as realistic letter body text:
  - Start with a role/company-aware opening sentence.
  - Keep a clear middle focused on relevant achievements and fit.
  - End with a polite, forward-looking closing sentence.
  - Keep first-person voice ("I"), natural flow, and professional tone.
  - Do NOT output bullet points, outlines, headings, or fragmented statements.`
  : ''}`;

      const systemPrompt = 'You are an expert CV writer. Return ONLY valid JSON. No markdown.';
      console.log('[ai:cv_rewrite_suggestions] prompt', {
        systemPrompt,
        basePrompt,
        section,
        inputLabel,
        tones,
        wordLimit,
        context,
        isCoverLetterRequest,
      });

      async function generateOnce(
        extraInstruction?: string
      ): Promise<{
        suggestions: Array<{ text: string; tone: string; why: string }>;
        best_index: number;
        best_reason: string;
      }> {
        const out = await claudeTextCompletion(
          systemPrompt,
          extraInstruction ? `${basePrompt}\n\n${extraInstruction}` : basePrompt,
          1200
        );
        const clean = out.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(clean) as {
          suggestions?: Array<string | { text?: string; tone?: string; why?: string }>;
          best_index?: number;
          best_reason?: string;
        };
        const suggestions = (parsed.suggestions ?? [])
          .map((item) => {
            if (typeof item === 'string') {
              return {
                text: item,
                tone: tones[0] ?? 'professional',
                why: 'Clear and relevant rewrite.',
              };
            }
            return {
              text: item.text ?? '',
              tone: (item.tone ?? tones[0] ?? 'professional').trim(),
              why: (item.why ?? 'Clear and relevant rewrite.').trim(),
            };
          })
          .filter((s) => s.text.trim().length > 0)
          .slice(0, 3)
          .map((s) => ({
            text: isCoverLetterRequest
              ? enforceCoverLetterParagraphs(clampWords(normalizeParagraphSpacing(s.text), wordLimit))
              : clampWords(normalizeParagraphSpacing(s.text), wordLimit),
            tone: s.tone || (tones[0] ?? 'professional'),
            why: s.why || 'Clear and relevant rewrite.',
          }))
          .filter((s) => looksLikeCompleteSentence(s.text.replace(/\n+/g, ' ')));

        return {
          suggestions,
          best_index:
            typeof parsed.best_index === 'number' && parsed.best_index >= 0 && parsed.best_index <= 2
              ? parsed.best_index
              : 0,
          best_reason: (parsed.best_reason ?? '').trim(),
        };
      }

      let result = await generateOnce();
      if (result.suggestions.length < 3) {
        result = await generateOnce(
          `Your previous response had incomplete or fragmented lines.
Return exactly 3 complete, meaningful suggestions, with tone/why per suggestion, plus best_index and best_reason.`
        );
      }

      console.log('[ai:cv_rewrite_suggestions] response', result);

      return NextResponse.json({ result });
    }

    return NextResponse.json({ error: 'unknown_tool' }, { status: 400 });
  } catch (e) {
    console.error('ai route', e);
    return NextResponse.json({ error: 'ai_failed' }, { status: 500 });
  }
}
