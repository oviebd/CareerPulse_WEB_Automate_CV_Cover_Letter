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
  content?: string;
  template_id?: string;
  accent_color?: string;
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
    if (!letterId) {
      return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
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

    const { data: cvForLetter } = await supabase
      .from('cv_profiles')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const content =
      typeof body.content === 'string' ? body.content : cl.content;
    const accent = body.accent_color?.trim() || '#2563EB';

    const templatePath = path.join(
      process.cwd(),
      'templates',
      'cover-letter',
      `${templateId}.html`
    );
    const templateHtml = await readFile(templatePath, 'utf-8');
    const vars = buildCoverLetterVariables(cvForLetter, {
      content,
      company_name: cl.company_name,
      job_title: cl.job_title,
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
