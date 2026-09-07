import { readFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import {
  buildCoverLetterVariables,
  renderCoverLetterPageHtml,
} from '@/lib/cover-letter-html';
import { generateCoverLetterDocx } from '@/lib/cover-letter-docx';
import { exportCV, generatePDF } from '@/lib/pdf';
import { canAccessFeature } from '@/lib/subscription';
import { resolveEffectiveTier } from '@/lib/dev-subscription';
import { assertTemplateAccess } from '@/lib/templates/access';
import { rateLimitHit } from '@/lib/rate-limit';
import { CL_TEMPLATE_IDS } from '@/src/config/templateConfig';
import type { CoverLetter, CVProfile } from '@/types';
import { getCoverLettersRepo } from '@/lib/db/repositories/cover-letters';
import { getCvsRepo } from '@/lib/db/repositories/cvs';
import { getJobsRepo } from '@/lib/db/repositories/jobs';
import { getProfilesRepo } from '@/lib/db/repositories/profiles';
import { storageSignedUrl, storageUploadBuffer } from '@/lib/storage';

export const runtime = 'nodejs';
export const maxDuration = 60;

type ExportBody = {
  type?: 'cv' | 'cover_letter';
  template_id?: string;
  templateId?: string;
  accent_color?: string;
  primaryColor?: string;
  id?: string;
  format?: 'pdf' | 'docx';
  cv_snapshot?: Record<string, unknown>;
  job_cv_id?: string;
  content?: string;
  company_name?: string | null;
  job_title?: string | null;
  applicant_name?: string | null;
  applicant_role?: string | null;
  applicant_email?: string | null;
  applicant_phone?: string | null;
  applicant_location?: string | null;
  font_family?: string;
};

function pickGeneralOrLatest(rows: Record<string, unknown>[]) {
  return (
    rows.find((r) => !Array.isArray(r.job_ids) || (r.job_ids as string[]).length === 0) ??
    rows[0]
  );
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (rateLimitHit(`export:${user.id}`)) {
      return NextResponse.json({ error: 'RATE_LIMIT' }, { status: 429 });
    }

    const body = (await request.json()) as ExportBody;

    if (!body.type) {
      return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
    }

    const format = body.format ?? 'pdf';

    if (body.type === 'cv') {
      const accent = body.accent_color ?? body.primaryColor ?? '#6C63FF';

      if (body.job_cv_id) {
        const jobCv = await getCvsRepo().getById(user.id, body.job_cv_id);
        if (!jobCv) {
          return NextResponse.json({ error: 'not_found' }, { status: 404 });
        }
        const jobIds = (jobCv.job_ids as string[] | null) ?? [];
        let resolvedCompany = '';
        let resolvedTitle = 'role';
        if (jobIds.length > 0) {
          const jobRow = await getJobsRepo().getById(user.id, jobIds[0]);
          if (jobRow) {
            resolvedCompany = (jobRow.company_name as string | null) ?? '';
            resolvedTitle = (jobRow.job_title as string | null) ?? 'role';
          }
        }
        const templateId =
          body.template_id ??
          body.templateId ??
          (jobCv.preferred_template_id as string | undefined) ??
          'classic';
        const jobCvAccent =
          body.accent_color ?? (jobCv.accent_color as string | undefined) ?? '#6C63FF';
        const baseSnapshot = {
          full_name: jobCv.full_name,
          professional_title: jobCv.professional_title,
          email: jobCv.email,
          phone: jobCv.phone,
          location: jobCv.location,
          linkedin_url: jobCv.linkedin_url,
          github_url: jobCv.github_url,
          links: jobCv.links ?? [],
          summary: jobCv.summary,
          experience: jobCv.experience,
          education: jobCv.education,
          skills: jobCv.skills,
          projects: jobCv.projects,
          certifications: jobCv.certifications,
          languages: jobCv.languages,
          awards: jobCv.awards,
        };
        const overrides =
          body.cv_snapshot && typeof body.cv_snapshot === 'object'
            ? (body.cv_snapshot as Record<string, unknown>)
            : null;
        const snapshot = overrides
          ? ({ ...baseSnapshot, ...overrides } as Partial<CVProfile>)
          : (baseSnapshot as Partial<CVProfile>);
        try {
          const { pdf } = await exportCV(
            user.id,
            templateId,
            jobCvAccent,
            snapshot,
            null,
            body.font_family ?? (jobCv.font_family as string | undefined),
            format
          );
          const companySlug = resolvedCompany
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
          const titleSlug = resolvedTitle
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
          const ext = format === 'docx' ? 'docx' : 'pdf';
          const filename = `cv-${companySlug ? `${companySlug}-` : ''}${titleSlug}.${ext}`;
          return new NextResponse(new Uint8Array(pdf), {
            status: 200,
            headers: {
              'Content-Type':
                format === 'docx'
                  ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                  : 'application/pdf',
              'Content-Disposition': `attachment; filename="${filename}"`,
            },
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : '';
          if (msg === 'TEMPLATE_NOT_FOUND') {
            return NextResponse.json({ error: 'template_not_found' }, { status: 404 });
          }
          if (msg === 'TEMPLATE_FORBIDDEN') {
            return NextResponse.json({ error: 'forbidden' }, { status: 403 });
          }
          if (msg === 'DOCX_FORBIDDEN') {
            return NextResponse.json({ error: 'docx_upgrade_required' }, { status: 403 });
          }
          if (msg === 'CV_NOT_FOUND') {
            return NextResponse.json({ error: 'cv_not_found' }, { status: 404 });
          }
          console.error('export job cv', e);
          return NextResponse.json({ error: 'export_failed' }, { status: 500 });
        }
      }

      const templateId = body.template_id ?? body.templateId;
      if (!templateId) {
        return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
      }

      const coreCvId = body.id ?? undefined;

      try {
        const snapshot = body.cv_snapshot ?? null;
        let resolvedCoreCvId = coreCvId;
        if (coreCvId) {
          const cvRow = await getCvsRepo().getById(user.id, coreCvId);
          if (!cvRow) {
            if (!snapshot) {
              return NextResponse.json({ error: 'not_found' }, { status: 404 });
            }
            resolvedCoreCvId = undefined;
          }
        }
        const { pdf, filename } = await exportCV(
          user.id,
          templateId,
          accent,
          snapshot,
          resolvedCoreCvId,
          body.font_family,
          format
        );
        return new NextResponse(new Uint8Array(pdf), {
          status: 200,
          headers: {
            'Content-Type':
              format === 'docx'
                ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                : 'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}"`,
          },
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : '';
        if (msg === 'TEMPLATE_NOT_FOUND') {
          return NextResponse.json({ error: 'template_not_found' }, { status: 404 });
        }
        if (msg === 'TEMPLATE_FORBIDDEN') {
          return NextResponse.json({ error: 'forbidden' }, { status: 403 });
        }
        if (msg === 'DOCX_FORBIDDEN') {
          return NextResponse.json({ error: 'docx_upgrade_required' }, { status: 403 });
        }
        if (msg === 'CV_NOT_FOUND') {
          return NextResponse.json({ error: 'cv_not_found' }, { status: 404 });
        }
        if (msg === 'CV_INCOMPLETE') {
          return NextResponse.json({ error: 'cv_incomplete' }, { status: 422 });
        }
        if (msg === 'PROFILE_NOT_FOUND') {
          return NextResponse.json({ error: 'profile_not_found' }, { status: 404 });
        }
        console.error('export cv', e);
        return NextResponse.json({ error: 'export_failed' }, { status: 500 });
      }
    }

    const templateId = body.template_id ?? body.templateId;
    if (!body.id || !templateId) {
      return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
    }

    if (!(CL_TEMPLATE_IDS as readonly string[]).includes(templateId)) {
      return NextResponse.json({ error: 'invalid_template' }, { status: 400 });
    }

    const profile = await getProfilesRepo().getById(user.id);
    const tier = resolveEffectiveTier(profile?.subscription_tier ?? 'free');
    try {
      await assertTemplateAccess(templateId, tier);
    } catch {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const letter = await getCoverLettersRepo().getById(user.id, body.id);
    if (!letter) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const cl = letter as unknown as CoverLetter;
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
    const contentForExport =
      typeof body.content === 'string' ? body.content : cl.content ?? '';
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
    const cvRows = await getCvsRepo().listByUser(user.id, { includeArchived: true });
    const cvForLetter = pickGeneralOrLatest(cvRows);

    if (format === 'docx') {
      const tier = resolveEffectiveTier(profile?.subscription_tier ?? 'free');
      if (!canAccessFeature(tier, 'docxExport')) {
        return NextResponse.json({ error: 'docx_upgrade_required' }, { status: 403 });
      }
      const vars = buildCoverLetterVariables(
        cvForLetter,
        {
          content: contentForExport,
          company_name: companyName,
          job_title: jobTitle,
          applicant_name: applicantName,
          applicant_role: applicantRole,
          applicant_email: applicantEmail,
          applicant_phone: applicantPhone,
          applicant_location: applicantLocation,
        },
        body.primaryColor ?? body.accent_color ?? '#2563EB'
      );
      const buf = await generateCoverLetterDocx(templateId, vars);
      const filePath = `${user.id}/cl-${body.id}-${Date.now()}.docx`;
      try {
        await storageUploadBuffer(
          'pdf-exports',
          filePath,
          buf,
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        );
      } catch {
        return NextResponse.json({ error: 'upload_failed' }, { status: 500 });
      }
      const signedUrl = await storageSignedUrl('pdf-exports', filePath, 3600);
      await getCoverLettersRepo().update(user.id, body.id, { docx_url: signedUrl });
      return NextResponse.json({ docxUrl: signedUrl });
    }

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
        content: contentForExport,
        company_name: companyName,
        job_title: jobTitle,
        applicant_name: applicantName,
        applicant_role: applicantRole,
        applicant_email: applicantEmail,
        applicant_phone: applicantPhone,
        applicant_location: applicantLocation,
      },
      body.primaryColor ?? body.accent_color ?? '#2563EB'
    );
    const html = renderCoverLetterPageHtml(templateHtml, vars, profile?.subscription_tier);
    const pdfBuffer = await generatePDF(html);
    const filePath = `${user.id}/cl-${templateId}-${Date.now()}.pdf`;
    try {
      await storageUploadBuffer('pdf-exports', filePath, pdfBuffer, 'application/pdf');
    } catch {
      return NextResponse.json({ error: 'upload_failed' }, { status: 500 });
    }
    let signedUrl: string;
    try {
      signedUrl = await storageSignedUrl('pdf-exports', filePath, 3600);
    } catch {
      return NextResponse.json({ error: 'sign_failed' }, { status: 500 });
    }
    await getCoverLettersRepo().update(user.id, body.id, { pdf_url: signedUrl });
    return NextResponse.json({ pdfUrl: signedUrl });
  } catch (e) {
    console.error('export', e);
    return NextResponse.json({ error: 'export_failed' }, { status: 500 });
  }
}
