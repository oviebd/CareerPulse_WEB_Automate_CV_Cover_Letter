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
import type { CVProfile } from '@/types';

function isAllowedStorageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).host;
    return parsed.protocol === 'https:' && parsed.host === supabaseHost;
  } catch {
    return false;
  }
}

function clientIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}

export const runtime = 'nodejs';
export const maxDuration = 60;

async function extractFromBuffer(buf: Buffer) {
  assertFileSize(buf.length);
  const kind = validatePdfOrDocx(buf);
  if (!kind) {
    return { error: 'invalid_file_type' as const };
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
    return { error: 'extraction_failed' as const };
  }

  let parsed: Record<string, unknown>;
  try {
    const extracted = await extractCVFromText(rawText, hyperlinkPromptSection);
    parsed = normalizeExtractedCV(extracted as Record<string, unknown>);
  } catch (e) {
    console.error('Claude extract failed', e);
    return { error: 'extraction_failed' as const };
  }

  const { percentage, isComplete } = computeCompletionPercentage(
    parsed as Parameters<typeof computeCompletionPercentage>[0]
  );

  return { parsed, percentage, isComplete };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      guest?: boolean;
      fileBase64?: string;
      fileUrl?: string;
      force?: boolean;
    };

    if (body.guest === true) {
      if (typeof body.fileBase64 !== 'string' || !body.fileBase64.trim()) {
        return NextResponse.json({ error: 'fileBase64_required' }, { status: 400 });
      }
      if (rateLimitHit(`extract:guest:${clientIp(request)}`)) {
        return NextResponse.json({ error: 'RATE_LIMIT' }, { status: 429 });
      }
      let buf: Buffer;
      try {
        buf = Buffer.from(body.fileBase64, 'base64');
      } catch {
        return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
      }
      const result = await extractFromBuffer(buf);
      if ('error' in result && result.error) {
        if (result.error === 'invalid_file_type') {
          return NextResponse.json({ error: 'invalid_file_type' }, { status: 400 });
        }
        return NextResponse.json({ error: result.error }, { status: 422 });
      }
      const { parsed, percentage, isComplete } = result;
      const now = new Date().toISOString();
      const GUEST_USER = '00000000-0000-0000-0000-000000000000';
      const cvProfile: CVProfile = {
        id: randomUUID(),
        user_id: GUEST_USER,
        name: 'Imported CV',
        ...parsed,
        experience: (parsed.experience ?? []) as CVProfile['experience'],
        education: (parsed.education ?? []) as CVProfile['education'],
        skills: (parsed.skills ?? []) as CVProfile['skills'],
        projects: (parsed.projects ?? []) as CVProfile['projects'],
        certifications: (parsed.certifications ?? []) as CVProfile['certifications'],
        languages: (parsed.languages ?? []) as CVProfile['languages'],
        awards: (parsed.awards ?? []) as CVProfile['awards'],
        referrals: (parsed.referrals ?? []) as CVProfile['referrals'],
        section_visibility: (parsed.section_visibility ?? {}) as CVProfile['section_visibility'],
        completion_percentage: percentage,
        is_complete: isComplete,
        original_cv_file_url: null,
        preferred_template_id: 'classic',
        preferred_cl_template_id: 'cl-classic',
        created_at: now,
        updated_at: now,
      } as CVProfile;
      return NextResponse.json({ success: true, cvProfile });
    }

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

    if (!body.fileUrl) {
      return NextResponse.json({ error: 'fileUrl_required' }, { status: 400 });
    }
    if (!isAllowedStorageUrl(body.fileUrl)) {
      return NextResponse.json({ error: 'invalid_file_url' }, { status: 400 });
    }

    // Enforce tier limit on the number of saved core CV versions.
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
    const ex = await extractFromBuffer(buf);
    if ('error' in ex && ex.error) {
      if (ex.error === 'invalid_file_type') {
        return NextResponse.json({ error: 'invalid_file_type' }, { status: 400 });
      }
      return NextResponse.json({ error: ex.error }, { status: 422 });
    }
    const { parsed, percentage, isComplete } = ex;

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

    const cvProfile: CVProfile = {
      id: existing?.id ?? randomUUID(),
      user_id: user.id,
      name: 'Imported CV',
      ...parsed,
      experience: (parsed.experience ?? []) as CVProfile['experience'],
      education: (parsed.education ?? []) as CVProfile['education'],
      skills: (parsed.skills ?? []) as CVProfile['skills'],
      projects: (parsed.projects ?? []) as CVProfile['projects'],
      certifications: (parsed.certifications ?? []) as CVProfile['certifications'],
      languages: (parsed.languages ?? []) as CVProfile['languages'],
      awards: (parsed.awards ?? []) as CVProfile['awards'],
      referrals: (parsed.referrals ?? []) as CVProfile['referrals'],
      section_visibility: (parsed.section_visibility ?? {}) as CVProfile['section_visibility'],
      completion_percentage: percentage,
      is_complete: isComplete,
      original_cv_file_url: null,
      preferred_template_id:
        (existing as { preferred_template_id?: string } | null)?.preferred_template_id ?? 'classic',
      preferred_cl_template_id:
        (profileRow as { preferred_cl_template_id?: string } | null)?.preferred_cl_template_id ??
        'cl-classic',
      created_at: existing?.created_at ?? new Date().toISOString(),
      updated_at: existing?.updated_at ?? new Date().toISOString(),
    } as CVProfile;

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
