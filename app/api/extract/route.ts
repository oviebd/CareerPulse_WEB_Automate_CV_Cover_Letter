import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { extractCVFromText, describeAnthropicError } from '@/lib/claude';
import { computeCompletionPercentage } from '@/lib/cv-completion';
import { normalizeExtractedCV } from '@/lib/cv-parse-payload';
import { rateLimitHit } from '@/lib/rate-limit';
import { handleAiRouteError } from '@/lib/credits/api-errors';
import { resolveEffectiveTier } from '@/lib/dev-subscription';
import { TIER_LIMITS } from '@/types';
import {
  extractDocumentTextFromBuffer,
  isAllowedStorageUrl,
} from '@/lib/extract-document-text';
import { getSessionUser } from '@/lib/auth/session';
import { runWithAiUsageContext } from '@/lib/ai/usage-context';
import { getCvsRepo } from '@/lib/db/repositories/cvs';
import { getProfilesRepo } from '@/lib/db/repositories/profiles';
import { fetchStorageFileBuffer } from '@/lib/storage/fetch-file';
import type { CVProfile } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

function anthropicApiKeyConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

async function extractFromBuffer(buf: Buffer) {
  const textEx = await extractDocumentTextFromBuffer(buf);
  if ('error' in textEx) {
    return { error: textEx.error };
  }

  if (!anthropicApiKeyConfigured()) {
    return { error: 'missing_api_key' as const };
  }

  let parsed: Record<string, unknown>;
  try {
    const extracted = await extractCVFromText(
      textEx.rawText,
      textEx.hyperlinkPromptSection
    );
    parsed = normalizeExtractedCV(extracted as Record<string, unknown>);
  } catch (e) {
    console.error('Claude extract failed', e);
    return {
      error: 'ai_extract_failed' as const,
      detail: describeAnthropicError(e),
    };
  }

  const { percentage, isComplete } = computeCompletionPercentage(
    parsed as Parameters<typeof computeCompletionPercentage>[0]
  );

  return { parsed, percentage, isComplete };
}

function extractErrorResponse(result: { error: string; detail?: string }) {
  const payload = result.detail
    ? { error: result.error, detail: result.detail }
    : { error: result.error };
  if (result.error === 'invalid_file_type') {
    return NextResponse.json(payload, { status: 400 });
  }
  if (result.error === 'missing_api_key') {
    return NextResponse.json(payload, { status: 503 });
  }
  return NextResponse.json(payload, { status: 422 });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      fileUrl?: string;
      force?: boolean;
    };

    const user = await getSessionUser();
    if (!user) {
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

    const profile = await getProfilesRepo().getById(user.id);
    const tier = resolveEffectiveTier(profile?.subscription_tier);
    const uploadLimit = TIER_LIMITS[tier].cvUploads;

    if (uploadLimit !== Number.POSITIVE_INFINITY && !body.force) {
      const existingCvs = await getCvsRepo().listByUser(user.id);
      if (existingCvs.length >= uploadLimit) {
        return NextResponse.json(
          { error: 'CV_UPLOAD_LIMIT', code: 'overwrite_requires_force' },
          { status: 403 }
        );
      }
    }

    const fileResult = await fetchStorageFileBuffer(body.fileUrl, user.id);
    if (!fileResult.ok) {
      return NextResponse.json({ error: fileResult.error }, { status: 400 });
    }

    const ex = await runWithAiUsageContext({ userId: user.id, category: 'cv_creation' }, () =>
      extractFromBuffer(fileResult.buffer)
    );
    if ('error' in ex && ex.error) {
      return extractErrorResponse(ex);
    }
    const { parsed, percentage, isComplete } = ex;

    const existingRows = await getCvsRepo().listByUser(user.id);
    const existing = existingRows[0] as
      | {
          id: string;
          preferred_template_id?: string;
          created_at?: string;
          updated_at?: string;
        }
      | undefined;

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
      preferred_template_id: existing?.preferred_template_id ?? 'classic',
      preferred_cl_template_id: profile?.preferred_cl_template_id ?? 'cl-classic',
      created_at: existing?.created_at ?? new Date().toISOString(),
      updated_at: existing?.updated_at ?? new Date().toISOString(),
    } as CVProfile;

    return NextResponse.json({ success: true, cvProfile });
  } catch (e) {
    const creditErr = handleAiRouteError(e);
    if (creditErr) return creditErr;
    console.error('extract route', e);
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'FILE_TOO_LARGE') {
      return NextResponse.json({ error: 'file_too_large' }, { status: 400 });
    }
    return NextResponse.json({ error: 'ai_extract_failed' }, { status: 500 });
  }
}
