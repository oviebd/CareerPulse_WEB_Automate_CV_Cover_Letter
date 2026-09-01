import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import type { GenerationType } from '@/types';
import type { Json } from '@/types/database';
import { CLAUDE_MODEL } from '@/lib/claude';
import { defaultJobCvDisplayName } from '@/lib/cv-display-name';
import { optimisedJsonToDbPayload } from '@/lib/optimise-result';
import { getCoverLettersRepo } from '@/lib/db/repositories/cover-letters';
import { getCvsRepo } from '@/lib/db/repositories/cvs';
import { getJobsRepo } from '@/lib/db/repositories/jobs';
import { getProfilesRepo } from '@/lib/db/repositories/profiles';

function err(
  msg: string,
  status: number,
  extra?: { code?: string; details?: string | null; hint?: string | null }
) {
  return NextResponse.json(
    { error: msg, code: extra?.code, details: extra?.details, hint: extra?.hint },
    { status }
  );
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return err('Unauthorized', 401);

    const body = (await request.json()) as {
      cvContent?: string;
      coverLetterContent?: string;
      originalCvId: string;
      jobId?: string | null;
      generationType: GenerationType;
      ai_changes_summary?: string | null;
      keywords_added?: string[];
      bullets_improved?: number;
      coverLetterTone?: string | null;
      coverLetterLength?: string | null;
      coverLetterEmphasis?: string | null;
      coverLetterTemplateId?: string | null;
      name?: string | null;
    };

    const originalCvId =
      typeof body.originalCvId === 'string' ? body.originalCvId.trim() : '';
    if (!originalCvId) return err('originalCvId is required', 400);

    const profileRow = await getProfilesRepo().getById(user.id);
    if (!profileRow) {
      return err('Your profile could not be found. Try signing out and back in.', 400);
    }

    const gen = body.generationType;
    if (gen !== 'cv' && gen !== 'coverLetter' && gen !== 'both') {
      return err('Invalid generationType', 400);
    }

    const hasCv = typeof body.cvContent === 'string' && body.cvContent.trim().length > 0;
    const hasCl =
      typeof body.coverLetterContent === 'string' &&
      body.coverLetterContent.trim().length > 0;

    if (gen === 'cv' && !hasCv) return err('cvContent is required', 400);
    if (gen === 'coverLetter' && !hasCl) return err('coverLetterContent is required', 400);
    if (gen === 'both' && (!hasCv || !hasCl)) {
      return err('Both cvContent and coverLetterContent are required', 400);
    }

    const jobId =
      typeof body.jobId === 'string' && body.jobId.trim() ? body.jobId.trim() : null;

    let cvPayload: Record<string, unknown> | null = null;
    if (hasCv) {
      try {
        cvPayload = optimisedJsonToDbPayload(body.cvContent!);
      } catch {
        return err('Invalid cvContent JSON', 422);
      }
    }

    let savedCvId: string | null = null;
    let savedCoverLetterId: string | null = null;

    const rawKw = body.keywords_added;
    const keywordsAddedJson: Json = Array.isArray(rawKw)
      ? rawKw.filter((k): k is string => typeof k === 'string')
      : [];

    const clientCvName =
      typeof body.name === 'string' && body.name.trim() ? body.name.trim() : null;

    if (hasCv && cvPayload) {
      let cvName = clientCvName ?? 'Tailored CV';
      let jobIds: string[] = [];
      if (jobId) {
        const jobRow = await getJobsRepo().getById(user.id, jobId);
        if (!jobRow) {
          return err('Job not found', 404);
        }
        const resolvedJobTitle = String(jobRow.job_title ?? '').trim() || 'Untitled role';
        const resolvedCompanyName = String(jobRow.company_name ?? '').trim() || 'Company';
        cvName = clientCvName ?? defaultJobCvDisplayName(resolvedJobTitle, resolvedCompanyName);
        jobIds = [jobId];
      }

      try {
        const data = await getCvsRepo().insert(user.id, {
          name: cvName,
          job_ids: jobIds,
          ...cvPayload,
          ai_changes_summary: body.ai_changes_summary ?? null,
          keywords_added: keywordsAddedJson,
          bullets_improved: body.bullets_improved ?? 0,
        });
        savedCvId = data.id as string;
      } catch (e) {
        console.error('save-optimised cv', e);
        const msg = e instanceof Error ? e.message : 'Failed to save CV';
        return err(msg || 'Failed to save CV', 500);
      }
    }

    if (hasCl) {
      const baseCv = await getCvsRepo().getById(user.id, originalCvId);

      try {
        const clRow = await getCoverLettersRepo().insert(user.id, {
          applicant_name: (baseCv?.full_name as string | null) ?? null,
          applicant_role: (baseCv?.professional_title as string | null) ?? null,
          applicant_email: (baseCv?.email as string | null) ?? null,
          applicant_phone: (baseCv?.phone as string | null) ?? null,
          applicant_location: (baseCv?.location as string | null) ?? null,
          tone: body.coverLetterTone ?? 'professional',
          length: body.coverLetterLength ?? 'medium',
          specific_emphasis: body.coverLetterEmphasis?.trim() || null,
          content: body.coverLetterContent!.trim(),
          template_id: body.coverLetterTemplateId?.trim() || 'cl-classic',
          generation_model: CLAUDE_MODEL,
          job_ids: jobId ? [jobId] : [],
        });
        savedCoverLetterId = clRow.id as string;
      } catch (e) {
        console.error('save-optimised cover letter', e);
        const msg = e instanceof Error ? e.message : 'Failed to save cover letter';
        return err(msg || 'Failed to save cover letter', 500);
      }
    }

    return NextResponse.json({
      cvId: savedCvId,
      coverLetterId: savedCoverLetterId,
      originalCvId,
    });
  } catch (e) {
    console.error('cvs/save-optimised', e);
    const msg = e instanceof Error ? e.message : 'save_failed';
    return err(msg, 500);
  }
}
