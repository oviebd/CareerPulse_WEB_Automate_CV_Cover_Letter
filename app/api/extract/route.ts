import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractCVFromText } from '@/lib/claude';
import { computeCompletionPercentage } from '@/lib/cv-completion';
import { assertFileSize, validatePdfOrDocx } from '@/lib/file-magic';
import { normalizeExtractedCV } from '@/lib/cv-parse-payload';
import { rateLimitHit } from '@/lib/rate-limit';
import { TIER_LIMITS, type SubscriptionTier } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (rateLimitHit(`extract:${user.id}`)) {
      return NextResponse.json({ error: 'RATE_LIMIT' }, { status: 429 });
    }

    const body = (await request.json()) as {
      fileUrl?: string;
      force?: boolean;
    };
    if (!body.fileUrl) {
      return NextResponse.json({ error: 'fileUrl_required' }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();
    const tier = (profile?.subscription_tier ?? 'free') as SubscriptionTier;
    const uploadLimit = TIER_LIMITS[tier].cvUploads;

    const { data: existing } = await supabase
      .from('cv_profiles')
      .select('id, original_cv_file_url')
      .eq('user_id', user.id)
      .maybeSingle();

    if (
      uploadLimit !== Number.POSITIVE_INFINITY &&
      existing?.original_cv_file_url &&
      !body.force
    ) {
      return NextResponse.json(
        { error: 'CV_UPLOAD_LIMIT', code: 'overwrite_requires_force' },
        { status: 403 }
      );
    }

    const fileRes = await fetch(body.fileUrl);
    if (!fileRes.ok) {
      return NextResponse.json({ error: 'file_fetch_failed' }, { status: 400 });
    }
    const buf = Buffer.from(await fileRes.arrayBuffer());
    assertFileSize(buf.length);
    const kind = validatePdfOrDocx(buf);
    if (!kind) {
      return NextResponse.json({ error: 'invalid_file_type' }, { status: 400 });
    }

    let rawText = '';
    if (kind === 'pdf') {
      const parser = new PDFParse({ data: new Uint8Array(buf) });
      try {
        const textResult = await parser.getText();
        rawText = textResult.text;
      } finally {
        await parser.destroy();
      }
    } else {
      const { value } = await mammoth.extractRawText({ buffer: buf });
      rawText = value;
    }

    if (!rawText.trim()) {
      return NextResponse.json({ error: 'extraction_failed' }, { status: 422 });
    }

    let parsed: Record<string, unknown>;
    try {
      const extracted = await extractCVFromText(rawText);
      parsed = normalizeExtractedCV(extracted as Record<string, unknown>);
    } catch (e) {
      console.error('Claude extract failed', e);
      return NextResponse.json({ error: 'extraction_failed' }, { status: 422 });
    }

    const { percentage, isComplete } = computeCompletionPercentage(
      parsed as Parameters<typeof computeCompletionPercentage>[0]
    );

    const row = {
      user_id: user.id,
      ...parsed,
      original_cv_file_url: body.fileUrl,
      completion_percentage: percentage,
      is_complete: isComplete,
    };

    const { data: cvProfile, error: upsertError } = await supabase
      .from('cv_profiles')
      .upsert(row, { onConflict: 'user_id' })
      .select()
      .single();

    if (upsertError) {
      console.error('cv upsert', upsertError);
      return NextResponse.json({ error: 'save_failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true, cvProfile });
  } catch (e) {
    console.error('extract route', e);
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'FILE_TOO_LARGE') {
      return NextResponse.json({ error: 'file_too_large' }, { status: 400 });
    }
    return NextResponse.json({ error: 'extraction_failed' }, { status: 500 });
  }
}
