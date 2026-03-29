import { readFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { createClient } from '@/lib/supabase/server';
import { generatePDF, injectTemplateData } from '@/lib/pdf';
import { cvToTemplateVars } from '@/lib/render-cv-html';
import type { CVProfile, CoverLetter } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = (await request.json()) as {
      type?: 'cv' | 'cover_letter';
      id?: string;
      templateId?: string;
      format?: 'pdf' | 'docx';
      primaryColor?: string;
    };

    if (!body.type || !body.id || !body.templateId) {
      return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
    }

    const format = body.format ?? 'pdf';

    const { data: tmpl, error: tmplErr } = await supabase
      .from('cv_templates')
      .select('id')
      .eq('id', body.templateId)
      .eq('type', body.type === 'cv' ? 'cv' : 'cover_letter')
      .maybeSingle();
    if (tmplErr || !tmpl) {
      return NextResponse.json({ error: 'invalid_template' }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();
    const tier = profile?.subscription_tier ?? 'free';

    if (body.type === 'cv') {
      const { data: cv, error } = await supabase
        .from('cv_profiles')
        .select('*')
        .eq('id', body.id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error || !cv) {
        return NextResponse.json({ error: 'not_found' }, { status: 404 });
      }

      const templatePath = path.join(
        process.cwd(),
        'templates',
        'cv',
        `${body.templateId}.html`
      );
      let html = await readFile(templatePath, 'utf-8');
      const vars = cvToTemplateVars(cv as CVProfile, body.primaryColor ?? '#2563EB');
      html = injectTemplateData(html, vars);
      if (tier === 'free') {
        html = html.replace(
          '</body>',
          '<div style="position:fixed;bottom:10mm;right:10mm;font-size:9px;color:#64748b;">Created with CV&amp;CL — cvai.app</div></body>'
        );
      }

      if (format === 'docx') {
        return NextResponse.json({ error: 'cv_docx_not_supported' }, { status: 400 });
      }

      const pdfBuffer = await generatePDF(html);
      const filePath = `${user.id}/cv-${body.templateId}-${Date.now()}.pdf`;
      const { error: upErr } = await supabase.storage
        .from('pdf-exports')
        .upload(filePath, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true,
        });
      if (upErr) {
        console.error('storage upload', upErr);
        return NextResponse.json({ error: 'upload_failed' }, { status: 500 });
      }
      const { data: signed, error: signErr } = await supabase.storage
        .from('pdf-exports')
        .createSignedUrl(filePath, 3600);
      if (signErr || !signed) {
        return NextResponse.json({ error: 'sign_failed' }, { status: 500 });
      }
      return NextResponse.json({ pdfUrl: signed.signedUrl });
    }

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
      `${body.templateId}.html`
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
      primary_color: body.primaryColor ?? '#2563EB',
    };
    html = injectTemplateData(html, vars);
    if (tier === 'free') {
      html = html.replace(
        '</body>',
        '<div style="position:fixed;bottom:10mm;right:10mm;font-size:9px;color:#64748b;">Created with CV&amp;CL — cvai.app</div></body>'
      );
    }
    const pdfBuffer = await generatePDF(html);
    const filePath = `${user.id}/cl-${body.templateId}-${Date.now()}.pdf`;
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
