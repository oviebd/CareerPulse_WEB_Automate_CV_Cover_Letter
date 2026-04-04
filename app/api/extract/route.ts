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
import {
  extractPdfHyperlinks,
  extractDocxHyperlinks,
  formatHyperlinksForPrompt,
} from '@/lib/cv-hyperlinks';

function isAllowedStorageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).host;
    return parsed.protocol === 'https:' && parsed.host === supabaseHost;
  } catch {
    return false;
  }
}

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
    if (!isAllowedStorageUrl(body.fileUrl)) {
      return NextResponse.json({ error: 'invalid_file_url' }, { status: 400 });
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
        .from('cvs')
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
    let hyperlinkPromptSection = '';
    const uint8 = new Uint8Array(buf);

    if (kind === 'pdf') {
      const [textResult, hyperlinks] = await Promise.all([
        (async () => {
          const parser = new PDFParse({ data: uint8 });
          try {
            return await parser.getText();
          } finally {
            await parser.destroy();
          }
        })(),
        extractPdfHyperlinks(uint8).catch(() => []),
      ]);
      rawText = textResult.text;
      hyperlinkPromptSection = formatHyperlinksForPrompt(hyperlinks);
    } else {
      const [textResult, hyperlinks] = await Promise.all([
        mammoth.extractRawText({ buffer: buf }),
        extractDocxHyperlinks(buf).catch(() => []),
      ]);
      rawText = textResult.value;
      hyperlinkPromptSection = formatHyperlinksForPrompt(hyperlinks);
    }

    if (!rawText.trim()) {
      return NextResponse.json({ error: 'extraction_failed' }, { status: 422 });
    }

    let parsed: Record<string, unknown>;
    try {
      const extracted = await extractCVFromText(rawText, hyperlinkPromptSection);
      parsed = normalizeExtractedCV(extracted as Record<string, unknown>);
    } catch (e) {
      console.error('Claude extract failed', e);
      return NextResponse.json({ error: 'extraction_failed' }, { status: 422 });
    }

    const { percentage, isComplete } = computeCompletionPercentage(
      parsed as Parameters<typeof computeCompletionPercentage>[0]
    );

    // IMPORTANT: extract-only endpoint.
    // It must not persist anything to `cvs`.
    const { data: existing } = await supabase
      .from('cvs')
      .select('id, preferred_template_id, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: profileRow } = await supabase
      .from('profiles')
      .select('preferred_cl_template_id')
      .eq('id', user.id)
      .maybeSingle();

    const cvProfile = {
      id: existing?.id ?? randomUUID(),
      user_id: user.id,
      name: 'Imported CV',
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
      preferred_template_id: (existing as { preferred_template_id?: string } | null)?.preferred_template_id ?? 'classic',
      preferred_cl_template_id:
        (profileRow as { preferred_cl_template_id?: string } | null)?.preferred_cl_template_id ??
        'cl-classic',
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
