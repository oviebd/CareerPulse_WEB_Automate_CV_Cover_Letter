import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimitHit } from '@/lib/rate-limit';
import { generateCVPreview } from '@/lib/pdf';
import { migrateLegacyCVData } from '@/src/utils/cvDefaults';
import { normalizeTemplateId } from '@/src/utils/cvDefaults';
import type { CVData, TemplateId } from '@/src/types/cv.types';

export const runtime = 'nodejs';
export const maxDuration = 60;

type Body = {
  cv_snapshot?: Record<string, unknown>;
  template_id?: string;
  accent_color?: string;
  font_family?: string;
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
    if (rateLimitHit(`cv-preview-png:${user.id}`)) {
      return NextResponse.json({ error: 'RATE_LIMIT' }, { status: 429 });
    }

    const body = (await request.json()) as Body;
    if (!body.cv_snapshot || typeof body.cv_snapshot !== 'object') {
      return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
    }

    let data = migrateLegacyCVData(body.cv_snapshot) as CVData;
    const tid = normalizeTemplateId(body.template_id ?? data.meta.templateId) as TemplateId;
    data.meta.templateId = tid;
    if (body.accent_color) {
      data.meta.colorScheme = body.accent_color;
    }
    if (body.font_family?.trim()) {
      data.meta.fontFamily = body.font_family.trim();
    }

    const png = await generateCVPreview(data);
    return NextResponse.json({ png });
  } catch (e) {
    console.error('preview-png', e);
    return NextResponse.json({ error: 'preview_failed' }, { status: 500 });
  }
}
