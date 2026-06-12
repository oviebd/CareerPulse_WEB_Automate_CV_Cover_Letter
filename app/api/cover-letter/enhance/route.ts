import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { enhanceCoverLetter } from '@/lib/claude';
import type { CoverLetterTone, CoverLetterLength } from '@/types';

export const runtime = 'nodejs';

type EnhanceBody = {
  content: string;
  targetRole?: string;
  targetCompany?: string;
  tone?: CoverLetterTone;
  length?: CoverLetterLength;
  specificEmphasis?: string;
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

    const body = (await request.json()) as EnhanceBody;
    const content = typeof body.content === 'string' ? body.content.trim() : '';
    if (content.length < 50) {
      return NextResponse.json(
        { error: 'Cover letter text is too short to enhance (min 50 characters).' },
        { status: 400 }
      );
    }

    const enhanced = await enhanceCoverLetter({
      existingContent: content,
      targetRole: body.targetRole?.trim() || undefined,
      targetCompany: body.targetCompany?.trim() || undefined,
      tone: body.tone,
      length: body.length,
      specificEmphasis: body.specificEmphasis?.trim() || undefined,
    });

    return NextResponse.json({ content: enhanced });
  } catch (e) {
    console.error('cover-letter/enhance POST', e);
    return NextResponse.json({ error: 'enhance_failed' }, { status: 500 });
  }
}
