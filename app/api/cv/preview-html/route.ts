import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSampleCVData } from '@/lib/cv-sample-data';
import { looseProfileToCVData, renderTemplate } from '@/lib/pdf';
import { renderUnifiedHtml } from '@/src/services/pdfRenderer';
import { TEMPLATE_CONFIGS } from '@/src/config/templateConfig';
import { normalizeTemplateId } from '@/src/utils/cvDefaults';
import type { TemplateId } from '@/src/types/cv.types';

export const runtime = 'nodejs';

function isValidCvTemplateId(id: string): boolean {
  return /^[a-z0-9-]+$/i.test(id) && id.length <= 64;
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

    if (!isValidCvTemplateId(templateId)) {
      return NextResponse.json({ error: 'invalid_template' }, { status: 400 });
    }
    if (!sample) {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
    }

    const cvData = getSampleCVData(accent);
    const tid = normalizeTemplateId(templateId) as TemplateId;
    const cfg = TEMPLATE_CONFIGS[tid];
    cvData.meta.templateId = tid;
    cvData.meta.showPhoto = cfg.showPhoto;
    cvData.meta.layout = cfg.layout === 'two-column' ? 'two-column' : 'single-column';
    cvData.meta.sectionOrder = [...cfg.sectionOrder];
    const html = renderUnifiedHtml(cvData);
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (e) {
    console.error('preview-html GET', e);
    return NextResponse.json({ error: 'render_failed' }, { status: 500 });
  }
}

type PostBody = {
  template_id?: string;
  accent_color?: string;
  cv?: Record<string, unknown>;
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
    const templateId = body.template_id ?? '';
    const accent = body.accent_color ?? '#6C63FF';

    if (!isValidCvTemplateId(templateId)) {
      return NextResponse.json({ error: 'invalid_template' }, { status: 400 });
    }
    if (!body.cv || typeof body.cv !== 'object') {
      return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
    }

    const { data: tmpl, error: tErr } = await supabase
      .from('cv_templates')
      .select('id, type')
      .eq('id', templateId)
      .eq('type', 'cv')
      .maybeSingle();
    if (tErr || !tmpl) {
      return NextResponse.json({ error: 'template_not_found' }, { status: 404 });
    }

    const cvData = looseProfileToCVData(body.cv, {
      accent_color: accent,
      watermark: false,
    });
    const html = renderTemplate(templateId, cvData);
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('preview-html POST', e);
    return NextResponse.json({ error: 'render_failed' }, { status: 500 });
  }
}
