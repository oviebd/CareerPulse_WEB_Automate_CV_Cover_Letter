import { readFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  buildCoverLetterVariables,
  getSampleCoverLetterPreviewVars,
  renderCoverLetterPageHtml,
} from '@/lib/cover-letter-html';
import type { CoverLetter } from '@/types';

export const runtime = 'nodejs';

function isValidCoverLetterTemplateId(id: string): boolean {
  return /^cl-[a-z0-9-]+$/i.test(id) && id.length <= 64;
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    const { data: tmpl, error: tmplErr } = await supabase
      .from('cv_templates')
      .select('id')
      .eq('id', templateId)
      .eq('type', 'cover_letter')
      .maybeSingle();
    if (tmplErr || !tmpl) {
      return NextResponse.json({ error: 'template_not_found' }, { status: 404 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .maybeSingle();

    const templatePath = path.join(
      process.cwd(),
      'templates',
      'cover-letter',
      `${templateId}.html`
    );
    const templateHtml = await readFile(templatePath, 'utf-8');
    const vars = getSampleCoverLetterPreviewVars(accent);
    const html = renderCoverLetterPageHtml(
      templateHtml,
      vars,
      profile?.subscription_tier,
      { preview: true }
    );
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (e) {
    console.error('cover-letter preview-html GET', e);
    return NextResponse.json({ error: 'render_failed' }, { status: 500 });
  }
}

type PostBody = {
  cover_letter_id?: string;
  /** Base CV row id — required for draft preview when cover_letter_id is omitted */
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
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as PostBody;
    const letterId = body.cover_letter_id?.trim();
    const originalCvId =
      typeof body.original_cv_id === 'string' ? body.original_cv_id.trim() : '';

    /** Draft preview: optimise result page before the letter is saved */
    if (!letterId) {
      const draftContent = typeof body.content === 'string' ? body.content : '';
      if (!draftContent.trim() || !originalCvId) {
        return NextResponse.json(
          { error: 'Provide cover_letter_id or (content + original_cv_id)' },
          { status: 400 }
        );
      }

      const { data: baseCv, error: cvErr } = await supabase
        .from('cvs')
        .select(
          'full_name, professional_title, email, phone, location, linkedin_url'
        )
        .eq('id', originalCvId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (cvErr || !baseCv) {
        return NextResponse.json({ error: 'cv_not_found' }, { status: 404 });
      }

      const templateId = (body.template_id?.trim() || 'cl-classic').trim();
      if (!isValidCoverLetterTemplateId(templateId)) {
        return NextResponse.json({ error: 'invalid_template' }, { status: 400 });
      }

      const { data: tmpl, error: tmplErr } = await supabase
        .from('cv_templates')
        .select('id')
        .eq('id', templateId)
        .eq('type', 'cover_letter')
        .maybeSingle();
      if (tmplErr || !tmpl) {
        return NextResponse.json({ error: 'template_not_found' }, { status: 404 });
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', user.id)
        .maybeSingle();

      const accent = body.accent_color?.trim() || '#2563EB';
      const companyName =
        typeof body.company_name === 'string' ? body.company_name : null;
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
        typeof body.applicant_location === 'string'
          ? body.applicant_location
          : undefined;

      const templatePath = path.join(
        process.cwd(),
        'templates',
        'cover-letter',
        `${templateId}.html`
      );
      const templateHtml = await readFile(templatePath, 'utf-8');
      const vars = buildCoverLetterVariables(baseCv, {
        content: draftContent,
        company_name: companyName,
        job_title: jobTitle,
        applicant_name: applicantName,
        applicant_role: applicantRole,
        applicant_email: applicantEmail,
        applicant_phone: applicantPhone,
        applicant_location: applicantLocation,
      }, accent);
      const html = renderCoverLetterPageHtml(
        templateHtml,
        vars,
        profile?.subscription_tier,
        { preview: true }
      );
      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      });
    }

    const { data: letter, error: leErr } = await supabase
      .from('cover_letters')
      .select('*')
      .eq('id', letterId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (leErr || !letter) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const cl = letter as CoverLetter;
    const templateId = (
      body.template_id?.trim() ||
      cl.template_id ||
      'cl-classic'
    ).trim();
    if (!isValidCoverLetterTemplateId(templateId)) {
      return NextResponse.json({ error: 'invalid_template' }, { status: 400 });
    }

    const { data: tmpl, error: tmplErr } = await supabase
      .from('cv_templates')
      .select('id')
      .eq('id', templateId)
      .eq('type', 'cover_letter')
      .maybeSingle();
    if (tmplErr || !tmpl) {
      return NextResponse.json({ error: 'template_not_found' }, { status: 404 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .maybeSingle();

    const { data: cvRows } = await supabase
      .from('cvs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(40);
    const cvForLetter =
      (cvRows ?? []).find(
        (r) => !Array.isArray(r.job_ids) || (r.job_ids as string[]).length === 0
      ) ?? cvRows?.[0];

    const jobIds = (cl.job_ids as string[] | undefined) ?? [];
    let resolvedCompany: string | null = null;
    let resolvedJobTitle: string | null = null;
    if (jobIds.length > 0) {
      const { data: jobRow } = await supabase
        .from('jobs')
        .select('company_name, job_title')
        .eq('id', jobIds[0])
        .eq('user_id', user.id)
        .maybeSingle();
      if (jobRow) {
        resolvedCompany = jobRow.company_name ?? null;
        resolvedJobTitle = jobRow.job_title ?? null;
      }
    }

    const content =
      typeof body.content === 'string' ? body.content : cl.content ?? '';
    const accent = body.accent_color?.trim() || '#2563EB';
    const companyName =
      typeof body.company_name === 'string'
        ? body.company_name
        : resolvedCompany;
    const jobTitle =
      typeof body.job_title === 'string' ? body.job_title : resolvedJobTitle;
    const applicantName =
      typeof body.applicant_name === 'string'
        ? body.applicant_name
        : cl.applicant_name;
    const applicantRole =
      typeof body.applicant_role === 'string'
        ? body.applicant_role
        : cl.applicant_role;
    const applicantEmail =
      typeof body.applicant_email === 'string'
        ? body.applicant_email
        : cl.applicant_email;
    const applicantPhone =
      typeof body.applicant_phone === 'string'
        ? body.applicant_phone
        : cl.applicant_phone;
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
    const vars = buildCoverLetterVariables(cvForLetter, {
      content,
      company_name: companyName,
      job_title: jobTitle,
      applicant_name: applicantName,
      applicant_role: applicantRole,
      applicant_email: applicantEmail,
      applicant_phone: applicantPhone,
      applicant_location: applicantLocation,
    }, accent);
    const html = renderCoverLetterPageHtml(
      templateHtml,
      vars,
      profile?.subscription_tier,
      { preview: true }
    );
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
