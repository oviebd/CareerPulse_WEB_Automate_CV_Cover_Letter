import { readFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { resolveEffectiveTier } from '@/lib/dev-subscription';
import { createClient } from '@/lib/supabase/server';
import { exportCV, generatePDF, injectTemplateData } from '@/lib/pdf';
import type { CoverLetter } from '@/types';

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
  /** Optional draft fields merged over the saved profile for PDF (preview flow). */
  cv_snapshot?: Record<string, unknown>;
  /** When provided, exports a job-specific CV instead of the core profile. */
  job_cv_id?: string;
};

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as ExportBody;

    if (!body.type) {
      return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
    }

    const format = body.format ?? 'pdf';

    if (body.type === 'cv') {
      const accent =
        body.accent_color ?? body.primaryColor ?? '#6C63FF';

      // Job-specific CV export
      if (body.job_cv_id) {
        const { data: jobCv, error: jErr } = await supabase
          .from('job_specific_cvs')
          .select('*')
          .eq('id', body.job_cv_id)
          .eq('user_id', user.id)
          .maybeSingle();
        if (jErr || !jobCv) {
          return NextResponse.json({ error: 'not_found' }, { status: 404 });
        }
        const templateId =
          body.template_id ?? body.templateId ?? jobCv.preferred_template_id ?? 'classic';
        const jobCvAccent = body.accent_color ?? jobCv.accent_color ?? '#6C63FF';
        const baseSnapshot = {
          full_name: jobCv.full_name,
          professional_title: jobCv.professional_title,
          email: jobCv.email,
          phone: jobCv.phone,
          location: jobCv.location,
          linkedin_url: jobCv.linkedin_url,
          portfolio_url: jobCv.portfolio_url,
          website_url: jobCv.website_url,
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
          ? { ...baseSnapshot, ...overrides }
          : baseSnapshot;
        try {
          const { pdf } = await exportCV(
            user.id,
            templateId,
            jobCvAccent,
            snapshot
          );
          const companySlug = (jobCv.company_name ?? '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
          const titleSlug = jobCv.job_title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
          const filename = `cv-${companySlug ? `${companySlug}-` : ''}${titleSlug}.pdf`;
          return new NextResponse(new Uint8Array(pdf), {
            status: 200,
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="${filename}"`,
            },
          });
        } catch (e) {
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
        if (!snapshot && coreCvId) {
          const { data: cvRow, error: cvRowErr } = await supabase
            .from('cv_profiles')
            .select('id')
            .eq('user_id', user.id)
            .eq('id', coreCvId)
            .maybeSingle();
          if (cvRowErr || !cvRow) {
            return NextResponse.json({ error: 'not_found' }, { status: 404 });
          }
        }
        const { pdf, filename } = await exportCV(
          user.id,
          templateId,
          accent,
          snapshot,
          coreCvId
        );
        return new NextResponse(new Uint8Array(pdf), {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
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
        if (msg === 'CV_NOT_FOUND') {
          return NextResponse.json({ error: 'not_found' }, { status: 404 });
        }
        if (msg === 'CV_INCOMPLETE') {
          return NextResponse.json({ error: 'cv_incomplete' }, { status: 422 });
        }
        if (msg === 'PROFILE_NOT_FOUND') {
          return NextResponse.json({ error: 'not_found' }, { status: 404 });
        }
        console.error('export cv', e);
        return NextResponse.json({ error: 'export_failed' }, { status: 500 });
      }
    }

    const templateId = body.template_id ?? body.templateId;
    if (!body.id || !templateId) {
      return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
    }

    const { data: tmpl, error: tmplErr } = await supabase
      .from('cv_templates')
      .select('id')
      .eq('id', templateId)
      .eq('type', 'cover_letter')
      .maybeSingle();
    if (tmplErr || !tmpl) {
      return NextResponse.json({ error: 'invalid_template' }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();
    const tier = resolveEffectiveTier(profile?.subscription_tier);

    const { data: letter, error: leErr } = await supabase
      .from('cover_letters')
      .select('*')
      .eq('id', body.id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (leErr || !letter) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const cl = letter as CoverLetter;
    const { data: cvForLetter } = await supabase
      .from('cv_profiles')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (format === 'docx') {
      const doc = new Document({
        sections: [
          {
            children: cl.content.split('\n').map(
              (line) =>
                new Paragraph({
                  children: [new TextRun(line || ' ')],
                })
            ),
          },
        ],
      });
      const buf = await Packer.toBuffer(doc);
      const filePath = `${user.id}/cl-${body.id}-${Date.now()}.docx`;
      const { error: upErr } = await supabase.storage
        .from('pdf-exports')
        .upload(filePath, buf, {
          contentType:
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          upsert: true,
        });
      if (upErr) {
        return NextResponse.json({ error: 'upload_failed' }, { status: 500 });
      }
      const { data: signed } = await supabase.storage
        .from('pdf-exports')
        .createSignedUrl(filePath, 3600);
      await supabase
        .from('cover_letters')
        .update({ docx_url: signed?.signedUrl ?? null })
        .eq('id', body.id);
      return NextResponse.json({ docxUrl: signed?.signedUrl });
    }

    const templatePath = path.join(
      process.cwd(),
      'templates',
      'cover-letter',
      `${templateId}.html`
    );
    let html = await readFile(templatePath, 'utf-8');
    const today = new Date().toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const vars: Record<string, string> = {
      applicant_name: cvForLetter?.full_name ?? '',
      applicant_email: cvForLetter?.email ?? '',
      applicant_phone: cvForLetter?.phone ?? '',
      applicant_location: cvForLetter?.location ?? '',
      applicant_linkedin: cvForLetter?.linkedin_url ?? '',
      company_name: cl.company_name ?? '',
      job_title: cl.job_title ?? '',
      date: today,
      cover_letter_body: cl.content.replaceAll('\n', '<br/>'),
      primary_color: body.primaryColor ?? body.accent_color ?? '#2563EB',
    };
    html = injectTemplateData(html, vars);
    if (tier === 'free') {
      html = html.replace(
        '</body>',
        '<div style="position:fixed;bottom:10mm;right:10mm;font-size:9px;color:#64748b;">Created with CV&amp;CL — cvai.app</div></body>'
      );
    }
    const pdfBuffer = await generatePDF(html);
    const filePath = `${user.id}/cl-${templateId}-${Date.now()}.pdf`;
    const { error: upErr } = await supabase.storage
      .from('pdf-exports')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });
    if (upErr) {
      return NextResponse.json({ error: 'upload_failed' }, { status: 500 });
    }
    const { data: signed, error: signErr } = await supabase.storage
      .from('pdf-exports')
      .createSignedUrl(filePath, 3600);
    if (signErr || !signed) {
      return NextResponse.json({ error: 'sign_failed' }, { status: 500 });
    }
    await supabase
      .from('cover_letters')
      .update({ pdf_url: signed.signedUrl })
      .eq('id', body.id);
    return NextResponse.json({ pdfUrl: signed.signedUrl });
  } catch (e) {
    console.error('export', e);
    return NextResponse.json({ error: 'export_failed' }, { status: 500 });
  }
}
