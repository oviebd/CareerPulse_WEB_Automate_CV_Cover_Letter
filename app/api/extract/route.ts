import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { extractCVFromText } from '@/lib/claude';
import { computeCompletionPercentage } from '@/lib/cv-completion';
import { assertFileSize, validatePdfOrDocx } from '@/lib/file-magic';
import { normalizeExtractedCV } from '@/lib/cv-parse-payload';
import { rateLimitHit } from '@/lib/rate-limit';
import { resolveEffectiveTier } from '@/lib/dev-subscription';
import { TIER_LIMITS } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
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

    // Enforce tier limit on number of saved core CV versions.
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();
    const tier = resolveEffectiveTier(profile?.subscription_tier);
    const uploadLimit = TIER_LIMITS[tier].cvUploads;

    if (uploadLimit !== Number.POSITIVE_INFINITY && !body.force) {
      const { count } = await supabase
        .from('cv_profiles')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id);
      const existingCount = typeof count === 'number' ? count : 0;
      if (existingCount >= uploadLimit) {
        return NextResponse.json(
          { error: 'CV_UPLOAD_LIMIT', code: 'overwrite_requires_force' },
          { status: 403 }
        );
      }
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

    // IMPORTANT: extract-only endpoint.
    // It must not persist anything to `cv_profiles`.
    const { data: existing } = await supabase
      .from('cv_profiles')
      .select('id, preferred_cv_template_id, preferred_cl_template_id, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const cvProfile = {
      id: existing?.id ?? randomUUID(),
      user_id: user.id,
      ...parsed,
      // Ensure arrays exist (editor expects them).
      experience: (parsed.experience ?? []) as unknown[],
      education: (parsed.education ?? []) as unknown[],
      skills: (parsed.skills ?? []) as unknown[],
      projects: (parsed.projects ?? []) as unknown[],
      certifications: (parsed.certifications ?? []) as unknown[],
      languages: (parsed.languages ?? []) as unknown[],
      awards: (parsed.awards ?? []) as unknown[],
      referrals: (parsed.referrals ?? []) as unknown[],
      section_visibility: (parsed.section_visibility ?? {}) as Record<string, unknown>,
      completion_percentage: percentage,
      is_complete: isComplete,
      // Do not store PDF location in DB (pdf is extract-only).
      original_cv_file_url: null,
      preferred_cv_template_id: existing?.preferred_cv_template_id ?? 'classic',
      preferred_cl_template_id: existing?.preferred_cl_template_id ?? 'cl-classic',
      created_at: existing?.created_at ?? new Date().toISOString(),
      updated_at: existing?.updated_at ?? new Date().toISOString(),
    };

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
