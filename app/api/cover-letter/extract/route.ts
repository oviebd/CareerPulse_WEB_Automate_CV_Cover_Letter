import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  extractCoverLetterFromText,
  describeAnthropicError,
} from '@/lib/claude';
import { rateLimitHit } from '@/lib/rate-limit';
import {
  extractDocumentTextFromBuffer,
  isAllowedStorageUrl,
} from '@/lib/extract-document-text';
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

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
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

    const fileRes = await fetch(body.fileUrl);
    if (!fileRes.ok) {
      return NextResponse.json({ error: 'file_fetch_failed' }, { status: 400 });
    }
    const buf = Buffer.from(await fileRes.arrayBuffer());

    let textEx: Awaited<ReturnType<typeof extractDocumentTextFromBuffer>>;
    try {
      textEx = await extractDocumentTextFromBuffer(buf);
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

    const { data: cvRows } = await supabase
      .from('cvs')
      .select('full_name, professional_title, email, phone, location, job_ids')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    const primaryCv =
      (cvRows ?? []).find(
        (r) => !Array.isArray(r.job_ids) || (r.job_ids as string[]).length === 0
      ) ?? cvRows?.[0] ?? null;

    const cvContact: PrimaryCvContact | null = primaryCv
      ? {
          full_name: primaryCv.full_name,
          professional_title: primaryCv.professional_title,
          email: primaryCv.email,
          phone: primaryCv.phone,
          location: primaryCv.location,
        }
      : null;

    let extracted: ExtractedCoverLetter | null = null;
    if (anthropicApiKeyConfigured()) {
      try {
        extracted = await extractCoverLetterFromText(textEx.rawText);
      } catch (e) {
        console.error('cover-letter Claude extract failed', e);
        // Fall through to raw text — still usable in the editor.
        extracted = null;
        void describeAnthropicError(e);
      }
    }

    const letter = mergeWithCvFallback(extracted, textEx.rawText, cvContact);
    if (!letter.content.trim()) {
      return extractErrorResponse({ error: 'empty_document' });
    }

    const { data: profileRow } = await supabase
      .from('profiles')
      .select('preferred_cl_template_id')
      .eq('id', user.id)
      .maybeSingle();

    const templateId =
      (profileRow as { preferred_cl_template_id?: string } | null)
        ?.preferred_cl_template_id ?? 'cl-classic';

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
