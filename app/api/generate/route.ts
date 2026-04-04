import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateCoverLetterStream, scoreATS } from '@/lib/claude';
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
    const supabase = await createClient();
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

    const { data: cvRows, error: cvErr } = await supabase
      .from('cvs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(40);
    const cvRow =
      (cvRows ?? []).find(
        (r) => !Array.isArray(r.job_ids) || (r.job_ids as string[]).length === 0
      ) ?? cvRows?.[0];
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

          await stream.finalMessage();

          if (canAccessFeature(tier, 'atsAccess')) {
            try {
              await scoreATS(body.jobDescription!, fullText);
            } catch (atsErr) {
              console.error('ATS scoring failed', atsErr);
            }
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ done: true, id: null })}\n\n`
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
