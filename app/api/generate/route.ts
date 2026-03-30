import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  CLAUDE_MODEL,
  generateCoverLetterStream,
  scoreATS,
} from '@/lib/claude';
import { rateLimitHit } from '@/lib/rate-limit';
import { resolveEffectiveTier } from '@/lib/dev-subscription';
import {
  assertGenerationAllowed,
  canAccessFeature,
} from '@/lib/subscription';
import type { CoverLetterLength, CoverLetterTone } from '@/types';

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
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
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
      templateId?: string;
    };

    if (!body.jobDescription?.trim()) {
      return NextResponse.json({ error: 'job_description_required' }, { status: 400 });
    }

    const { data: prof } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();
    const tier = resolveEffectiveTier(prof?.subscription_tier);

    try {
      await assertGenerationAllowed(user.id, tier, supabase);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.startsWith('GENERATION_LIMIT_REACHED')) {
        const parts = msg.split(':');
        return NextResponse.json(
          {
            error: 'GENERATION_LIMIT_REACHED',
            tier: parts[1],
            limit: Number(parts[2]),
          },
          { status: 402 }
        );
      }
      throw e;
    }

    const { data: cvRow, error: cvErr } = await supabase
      .from('cv_profiles')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (cvErr || !cvRow) {
      return NextResponse.json({ error: 'cv_profile_required' }, { status: 400 });
    }
    if (!cvRow.is_complete && (cvRow.completion_percentage ?? 0) < 40) {
      return NextResponse.json(
        { error: 'cv_profile_incomplete' },
        { status: 400 }
      );
    }

    const tone = body.tone && TONES.includes(body.tone) ? body.tone : 'professional';
    const length =
      body.length && LENGTHS.includes(body.length) ? body.length : 'medium';
    const companyName = body.companyName?.trim() || 'the company';
    const jobTitle = body.jobTitle?.trim() || 'the role';
    const templateId = body.templateId?.trim() || 'cl-classic';

    const stream = generateCoverLetterStream({
      cvProfile: cvRow,
      jobDescription: body.jobDescription,
      companyName,
      jobTitle,
      tone,
      length,
      specificEmphasis: body.specificEmphasis?.trim() ?? '',
    });

    const encoder = new TextEncoder();
    let fullText = '';

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              const t = event.delta.text;
              fullText += t;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: t })}\n\n`)
              );
            }
          }

          const final = await stream.finalMessage();
          const usage = final.usage;
          const inputTokens = usage?.input_tokens ?? null;
          const outputTokens = usage?.output_tokens ?? null;

          const { data: inserted, error: insErr } = await supabase
            .from('cover_letters')
            .insert({
              user_id: user.id,
              job_title: jobTitle,
              company_name: companyName,
              job_description: body.jobDescription,
              tone,
              length,
              specific_emphasis: body.specificEmphasis?.trim() || null,
              content: fullText,
              template_id: templateId,
              generation_model: CLAUDE_MODEL,
              input_tokens: inputTokens,
              output_tokens: outputTokens,
              ats_keywords_found: [],
              ats_keywords_missing: [],
            })
            .select('id')
            .single();

          if (insErr) {
            console.error('cover letter insert', insErr);
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ error: 'save_failed' })}\n\n`
              )
            );
            controller.close();
            return;
          }

          const letterId = inserted.id;

          if (canAccessFeature(tier, 'atsAccess')) {
            try {
              const ats = await scoreATS(body.jobDescription!, fullText);
              await supabase
                .from('cover_letters')
                .update({
                  ats_score: ats.score,
                  ats_keywords_found: ats.keywords_found,
                  ats_keywords_missing: ats.keywords_missing,
                  ats_summary: ats.summary,
                })
                .eq('id', letterId);
            } catch (atsErr) {
              console.error('ATS scoring failed', atsErr);
            }
          }

          console.log(
            JSON.stringify({
              model: CLAUDE_MODEL,
              input_tokens: inputTokens,
              output_tokens: outputTokens,
              user_id: user.id,
              feature_used: 'cover_letter',
              timestamp: new Date().toISOString(),
            })
          );

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ done: true, id: letterId })}\n\n`
            )
          );
          controller.close();
        } catch (err) {
          console.error('generate stream', err);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: 'generation_failed' })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (e) {
    console.error('generate', e);
    return NextResponse.json({ error: 'generation_failed' }, { status: 500 });
  }
}
