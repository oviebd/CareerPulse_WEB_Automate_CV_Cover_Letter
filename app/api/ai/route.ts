import { NextResponse } from 'next/server';
import { claudeTextCompletion } from '@/lib/claude';
import {
  getJdAnalyzeCountThisMonth,
  incrementJdAnalyze,
} from '@/lib/jd-monthly-limit';
import { resolveEffectiveTier } from '@/lib/dev-subscription';
import { canAccessFeature } from '@/lib/subscription';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

type Tool =
  | 'jd_analyze'
  | 'linkedin_summary'
  | 'cold_email'
  | 'bullet_improve'
  | 'interview_questions';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();
    const tier = resolveEffectiveTier(profile?.subscription_tier);

    const body = (await request.json()) as { tool?: Tool; payload?: Record<string, string> };
    const tool = body.tool;
    const payload = body.payload ?? {};

    if (!tool) {
      return NextResponse.json({ error: 'tool_required' }, { status: 400 });
    }

    if (tool === 'jd_analyze') {
      const jd = payload.jobDescription ?? '';
      if (!jd.trim()) {
        return NextResponse.json({ error: 'job_description_required' }, { status: 400 });
      }
      if (
        !canAccessFeature(tier, 'aiExtrasAccess') &&
        getJdAnalyzeCountThisMonth(user.id) >= 3
      ) {
        return NextResponse.json({ error: 'JD_ANALYZE_LIMIT' }, { status: 402 });
      }
      const text = await claudeTextCompletion(
        'Return ONLY valid JSON. No markdown.',
        `Analyze this job description and return JSON: {"seniority":"string","role_type":"string","required_skills":["string"],"red_flags":["string"],"summary":"string"}\n\nJOB:\n${jd}`,
        800
      );
      const clean = text.replace(/```json|```/g, '').trim();
      if (!canAccessFeature(tier, 'aiExtrasAccess')) {
        incrementJdAnalyze(user.id);
      }
      return NextResponse.json({ result: JSON.parse(clean) });
    }

    if (tool === 'linkedin_summary') {
      if (!canAccessFeature(tier, 'aiExtrasAccess')) {
        return NextResponse.json({ error: 'upgrade_required' }, { status: 402 });
      }
      const current = payload.text ?? '';
      const out = await claudeTextCompletion(
        'You rewrite LinkedIn summaries. Return only the new summary text.',
        `Rewrite for clarity and impact (max 2600 chars):\n${current}`,
        600
      );
      return NextResponse.json({ result: out.trim() });
    }

    if (tool === 'cold_email') {
      if (!canAccessFeature(tier, 'aiExtrasAccess')) {
        return NextResponse.json({ error: 'upgrade_required' }, { status: 402 });
      }
      const ctx = payload.context ?? '';
      const out = await claudeTextCompletion(
        'Return JSON with keys professional, friendly, concise — each a cold outreach email body.',
        `Context: ${ctx}`,
        1200
      );
      const clean = out.replace(/```json|```/g, '').trim();
      return NextResponse.json({ result: JSON.parse(clean) });
    }

    if (tool === 'bullet_improve') {
      if (!canAccessFeature(tier, 'aiExtrasAccess')) {
        return NextResponse.json({ error: 'upgrade_required' }, { status: 402 });
      }
      const bullet = payload.bullet ?? '';
      const out = await claudeTextCompletion(
        'Return JSON {"before":"","after":""} with improved resume bullet using metrics.',
        `Bullet: ${bullet}`,
        400
      );
      const clean = out.replace(/```json|```/g, '').trim();
      return NextResponse.json({ result: JSON.parse(clean) });
    }

    if (tool === 'interview_questions') {
      const needPremium = !['premium', 'career'].includes(tier);
      if (needPremium) {
        return NextResponse.json({ error: 'upgrade_required' }, { status: 402 });
      }
      const jd = payload.jobDescription ?? '';
      const out = await claudeTextCompletion(
        'Return ONLY JSON: {"behavioral":[],"technical":[],"questions_to_ask":[]}',
        `Generate interview prep for:\n${jd}`,
        1200
      );
      const clean = out.replace(/```json|```/g, '').trim();
      return NextResponse.json({ result: JSON.parse(clean) });
    }

    return NextResponse.json({ error: 'unknown_tool' }, { status: 400 });
  } catch (e) {
    console.error('ai route', e);
    return NextResponse.json({ error: 'ai_failed' }, { status: 500 });
  }
}
