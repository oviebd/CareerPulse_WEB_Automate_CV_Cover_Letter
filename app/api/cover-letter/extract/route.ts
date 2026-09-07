import { NextResponse } from 'next/server';
import {
  extractCoverLetterFromText,
  describeAnthropicError,
} from '@/lib/claude';
import { rateLimitHit } from '@/lib/rate-limit';
import {
  extractDocumentTextFromBuffer,
  isAllowedStorageUrl,
} from '@/lib/extract-document-text';
import { getSessionUser } from '@/lib/auth/session';
import { runWithAiUsageContext } from '@/lib/ai/usage-context';
import { handleAiRouteError } from '@/lib/credits/api-errors';
import { getCvsRepo } from '@/lib/db/repositories/cvs';
import { getProfilesRepo } from '@/lib/db/repositories/profiles';
import { fetchStorageFileBuffer } from '@/lib/storage/fetch-file';
import type { ExtractedCoverLetter } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

function anthropicApiKeyConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

function extractErrorResponse(result: { error: string; detail?: string }) {
  const payload = result.detail
    ? { error: result.error, detail: result.detail }
    : { error: result.error };
  if (result.error === 'invalid_file_type' || result.error === 'invalid_file_url') {
    return NextResponse.json(payload, { status: 400 });
  }
  if (result.error === 'missing_api_key') {
    return NextResponse.json(payload, { status: 503 });
  }
  return NextResponse.json(payload, { status: 422 });
}

type PrimaryCvContact = {
  full_name: string | null;
  professional_title: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
};

function mergeWithCvFallback(
  extracted: ExtractedCoverLetter | null,
  rawText: string,
  cv: PrimaryCvContact | null
): ExtractedCoverLetter {
  const content = (extracted?.content ?? rawText).trim();
  return {
    content,
    applicant_name: extracted?.applicant_name ?? cv?.full_name ?? null,
    applicant_role: extracted?.applicant_role ?? cv?.professional_title ?? null,
    applicant_email: extracted?.applicant_email ?? cv?.email ?? null,
    applicant_phone: extracted?.applicant_phone ?? cv?.phone ?? null,
    applicant_location: extracted?.applicant_location ?? cv?.location ?? null,
    company_name: extracted?.company_name ?? null,
    job_title: extracted?.job_title ?? null,
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { fileUrl?: string };

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (rateLimitHit(`cl-extract:${user.id}`)) {
      return NextResponse.json({ error: 'RATE_LIMIT' }, { status: 429 });
    }

    if (!body.fileUrl) {
      return NextResponse.json({ error: 'fileUrl_required' }, { status: 400 });
    }
    if (!isAllowedStorageUrl(body.fileUrl)) {
      return NextResponse.json({ error: 'invalid_file_url' }, { status: 400 });
    }

    const fileResult = await fetchStorageFileBuffer(body.fileUrl, user.id);
    if (!fileResult.ok) {
      return NextResponse.json({ error: fileResult.error }, { status: 400 });
    }

    let textEx: Awaited<ReturnType<typeof extractDocumentTextFromBuffer>>;
    try {
      textEx = await extractDocumentTextFromBuffer(fileResult.buffer);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'FILE_TOO_LARGE') {
        return NextResponse.json({ error: 'file_too_large' }, { status: 400 });
      }
      throw e;
    }

    if ('error' in textEx) {
      return extractErrorResponse({ error: textEx.error });
    }

    const cvRows = await getCvsRepo().listByUser(user.id);
    const primaryCv =
      cvRows.find(
        (r) =>
          !Array.isArray((r as { job_ids?: string[] }).job_ids) ||
          !((r as { job_ids?: string[] }).job_ids?.length)
      ) ?? cvRows[0] ?? null;

    const cvContact: PrimaryCvContact | null = primaryCv
      ? {
          full_name: (primaryCv as { full_name?: string | null }).full_name ?? null,
          professional_title:
            (primaryCv as { professional_title?: string | null }).professional_title ?? null,
          email: (primaryCv as { email?: string | null }).email ?? null,
          phone: (primaryCv as { phone?: string | null }).phone ?? null,
          location: (primaryCv as { location?: string | null }).location ?? null,
        }
      : null;

    let extracted: ExtractedCoverLetter | null = null;
    if (anthropicApiKeyConfigured()) {
      try {
        extracted = await runWithAiUsageContext(
          { userId: user.id, category: 'cover_letter', operation: 'extract' },
          () => extractCoverLetterFromText(textEx.rawText)
        );
      } catch (e) {
        const creditErr = handleAiRouteError(e);
        if (creditErr) return creditErr;
        console.error('cover-letter Claude extract failed', e);
        extracted = null;
        void describeAnthropicError(e);
      }
    }

    const letter = mergeWithCvFallback(extracted, textEx.rawText, cvContact);
    if (!letter.content.trim()) {
      return extractErrorResponse({ error: 'empty_document' });
    }

    const profileRow = await getProfilesRepo().getById(user.id);
    const templateId = profileRow?.preferred_cl_template_id ?? 'cl-classic';

    return NextResponse.json({
      success: true,
      letter,
      preferred_template_id: templateId,
    });
  } catch (e) {
    console.error('cover-letter/extract POST', e);
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'FILE_TOO_LARGE') {
      return NextResponse.json({ error: 'file_too_large' }, { status: 400 });
    }
    return NextResponse.json({ error: 'extraction_failed' }, { status: 500 });
  }
}
