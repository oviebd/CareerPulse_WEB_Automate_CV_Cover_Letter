import { readFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import {
  buildCoverLetterVariables,
  getSampleCoverLetterPreviewVars,
  renderCoverLetterPageHtml,
} from '@/lib/cover-letter-html';
import { CL_TEMPLATE_IDS, type ClTemplateId } from '@/src/config/templateConfig';
import type { CoverLetter } from '@/types';
import { getCoverLettersRepo } from '@/lib/db/repositories/cover-letters';
import { getCvsRepo } from '@/lib/db/repositories/cvs';
import { getJobsRepo } from '@/lib/db/repositories/jobs';
import { getProfilesRepo } from '@/lib/db/repositories/profiles';

export const runtime = 'nodejs';

function isValidCoverLetterTemplateId(id: string): boolean {
  return (CL_TEMPLATE_IDS as readonly string[]).includes(id);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('template_id') ?? '';
    const accent = searchParams.get('accent') ?? '#2563EB';
    const sample = searchParams.get('sample') === '1';

    if (!isValidCoverLetterTemplateId(templateId)) {
      return NextResponse.json({ error: 'invalid_template' }, { status: 400 });
    }
    if (!sample) {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
    }

    /** Public sample document only (no user data) — used by marketing + signed-in gallery. */
    const user = await getSessionUser();
    const profile = user ? await getProfilesRepo().getById(user.id) : null;

    const templatePath = path.join(
      process.cwd(),
      'templates',
      'cover-letter',
      `${templateId as ClTemplateId}.html`
    );
    const templateHtml = await readFile(templatePath, 'utf-8');
    const vars = getSampleCoverLetterPreviewVars(accent);
    const html = renderCoverLetterPageHtml(templateHtml, vars, profile?.subscription_tier, {
      preview: true,
    });
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': user
          ? 'private, max-age=60'
          : 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (e) {
    console.error('cover-letter preview-html GET', e);
    return NextResponse.json({ error: 'render_failed' }, { status: 500 });
  }
}

type PostBody = {
  cover_letter_id?: string;
  original_cv_id?: string;
  content?: string;
  template_id?: string;
  accent_color?: string;
  company_name?: string | null;
  job_title?: string | null;
  applicant_name?: string | null;
  applicant_role?: string | null;
  applicant_email?: string | null;
  applicant_phone?: string | null;
  applicant_location?: string | null;
};

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as PostBody;
    const letterId = body.cover_letter_id?.trim();
    const originalCvId =
      typeof body.original_cv_id === 'string' ? body.original_cv_id.trim() : '';

    if (!letterId) {
      const draftContent = typeof body.content === 'string' ? body.content : '';
      if (!draftContent.trim()) {
        return NextResponse.json(
          { error: 'Provide cover_letter_id or content' },
          { status: 400 }
        );
      }

      let baseCv: {
        full_name: string | null;
        professional_title: string | null;
        email: string | null;
        phone: string | null;
        location: string | null;
        linkedin_url: string | null;
      } | null = null;
      if (originalCvId) {
        const cvRow = await getCvsRepo().getById(user.id, originalCvId);
        if (!cvRow) {
          return NextResponse.json({ error: 'cv_not_found' }, { status: 404 });
        }
        baseCv = {
          full_name: (cvRow.full_name as string | null) ?? null,
          professional_title: (cvRow.professional_title as string | null) ?? null,
          email: (cvRow.email as string | null) ?? null,
          phone: (cvRow.phone as string | null) ?? null,
          location: (cvRow.location as string | null) ?? null,
          linkedin_url: (cvRow.linkedin_url as string | null) ?? null,
        };
      }
      const cvForPreview = baseCv ?? {
        full_name: null,
        professional_title: null,
        email: null,
        phone: null,
        location: null,
        linkedin_url: null,
      };

      const templateId = (body.template_id?.trim() || 'cl-classic').trim();
      if (!isValidCoverLetterTemplateId(templateId)) {
        return NextResponse.json({ error: 'invalid_template' }, { status: 400 });
      }

      const profile = await getProfilesRepo().getById(user.id);

      const accent = body.accent_color?.trim() || '#2563EB';
      const companyName = typeof body.company_name === 'string' ? body.company_name : null;
      const jobTitle = typeof body.job_title === 'string' ? body.job_title : null;
      const applicantName =
        typeof body.applicant_name === 'string' ? body.applicant_name : undefined;
      const applicantRole =
        typeof body.applicant_role === 'string' ? body.applicant_role : undefined;
      const applicantEmail =
        typeof body.applicant_email === 'string' ? body.applicant_email : undefined;
      const applicantPhone =
        typeof body.applicant_phone === 'string' ? body.applicant_phone : undefined;
      const applicantLocation =
        typeof body.applicant_location === 'string' ? body.applicant_location : undefined;

      const templatePath = path.join(
        process.cwd(),
        'templates',
        'cover-letter',
        `${templateId}.html`
      );
      const templateHtml = await readFile(templatePath, 'utf-8');
      const vars = buildCoverLetterVariables(
        cvForPreview,
        {
          content: draftContent,
          company_name: companyName,
          job_title: jobTitle,
          applicant_name: applicantName,
          applicant_role: applicantRole,
          applicant_email: applicantEmail,
          applicant_phone: applicantPhone,
          applicant_location: applicantLocation,
        },
        accent
      );
      const html = renderCoverLetterPageHtml(templateHtml, vars, profile?.subscription_tier, {
        preview: true,
      });
      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      });
    }

    const letter = await getCoverLettersRepo().getById(user.id, letterId);
    if (!letter) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const cl = letter as unknown as CoverLetter;
    const templateId = (body.template_id?.trim() || cl.template_id || 'cl-classic').trim();
    if (!isValidCoverLetterTemplateId(templateId)) {
      return NextResponse.json({ error: 'invalid_template' }, { status: 400 });
    }

    const profile = await getProfilesRepo().getById(user.id);

    const cvRows = await getCvsRepo().listByUser(user.id, { includeArchived: true });
    const cvForLetter =
      cvRows.find((r) => !Array.isArray(r.job_ids) || (r.job_ids as string[]).length === 0) ??
      cvRows[0];

    const jobIds = (cl.job_ids as string[] | undefined) ?? [];
    let resolvedCompany: string | null = null;
    let resolvedJobTitle: string | null = null;
    if (jobIds.length > 0) {
      const jobRow = await getJobsRepo().getById(user.id, jobIds[0]);
      if (jobRow) {
        resolvedCompany = (jobRow.company_name as string | null) ?? null;
        resolvedJobTitle = (jobRow.job_title as string | null) ?? null;
      }
    }

    const content = typeof body.content === 'string' ? body.content : cl.content ?? '';
    const accent = body.accent_color?.trim() || '#2563EB';
    const companyName =
      typeof body.company_name === 'string' ? body.company_name : resolvedCompany;
    const jobTitle = typeof body.job_title === 'string' ? body.job_title : resolvedJobTitle;
    const applicantName =
      typeof body.applicant_name === 'string' ? body.applicant_name : cl.applicant_name;
    const applicantRole =
      typeof body.applicant_role === 'string' ? body.applicant_role : cl.applicant_role;
    const applicantEmail =
      typeof body.applicant_email === 'string' ? body.applicant_email : cl.applicant_email;
    const applicantPhone =
      typeof body.applicant_phone === 'string' ? body.applicant_phone : cl.applicant_phone;
    const applicantLocation =
      typeof body.applicant_location === 'string'
        ? body.applicant_location
        : cl.applicant_location;

    const templatePath = path.join(
      process.cwd(),
      'templates',
      'cover-letter',
      `${templateId}.html`
    );
    const templateHtml = await readFile(templatePath, 'utf-8');
    const vars = buildCoverLetterVariables(
      cvForLetter,
      {
        content,
        company_name: companyName,
        job_title: jobTitle,
        applicant_name: applicantName,
        applicant_role: applicantRole,
        applicant_email: applicantEmail,
        applicant_phone: applicantPhone,
        applicant_location: applicantLocation,
      },
      accent
    );
    const html = renderCoverLetterPageHtml(templateHtml, vars, profile?.subscription_tier, {
      preview: true,
    });
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('cover-letter preview-html POST', e);
    return NextResponse.json({ error: 'render_failed' }, { status: 500 });
  }
}
