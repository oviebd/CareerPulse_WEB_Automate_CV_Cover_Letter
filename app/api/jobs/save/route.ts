import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/types/database';

function err(
  msg: string,
  status: number,
  extra?: { code?: string; details?: string | null; hint?: string | null }
) {
  return NextResponse.json(
    { error: msg, code: extra?.code, details: extra?.details, hint: extra?.hint },
    { status }
  );
}

function normalizeKeywords(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((k): k is string => typeof k === 'string')
    .map((k) => k.trim())
    .filter(Boolean);
}

/**
 * Persists a job row with keywords and AI summary (no raw JD).
 * Prefer this over ad-hoc inserts when saving from optimise flow.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return err('Unauthorized', 401);

    const body = (await request.json()) as {
      url?: string;
      keywords?: unknown;
      jobSummary?: string;
      title?: string;
      company?: string;
    };

    const job_url =
      typeof body.url === 'string' ? body.url.trim() || null : null;
    const keywords = normalizeKeywords(body.keywords);
    const job_summary =
      typeof body.jobSummary === 'string' ? body.jobSummary.trim() || null : null;
    const job_title =
      typeof body.title === 'string' && body.title.trim()
        ? body.title.trim()
        : 'Untitled role';
    const company_name =
      typeof body.company === 'string' && body.company.trim()
        ? body.company.trim()
        : 'Company';

    // jobs.user_id FK → profiles(id); avoid opaque 23503 from missing profile row
    const { data: profileRow, error: profileErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();
    if (profileErr) {
      console.error('jobs/save profile lookup', profileErr);
      return err('Could not verify your profile.', 500, {
        code: profileErr.code,
        details: profileErr.message,
      });
    }
    if (!profileRow) {
      return err(
        'Your profile could not be found. Try signing out and back in.',
        400
      );
    }

    // DB column `keywords` is JSONB (migration 012) — store as JSON-serialisable array
    const keywordsJson: Json = keywords;

    const { data, error } = await supabase
      .from('jobs')
      .insert({
        user_id: user.id,
        job_title,
        company_name,
        job_url,
        keywords: keywordsJson,
        job_summary,
      })
      .select()
      .single();

    if (error) {
      console.error('jobs/save', error);
      return err(
        error.message || 'Failed to save job',
        500,
        {
          code: error.code,
          details: error.details,
          hint: error.hint,
        }
      );
    }

    if (!data?.id) {
      return err('Save succeeded but no job id was returned.', 500);
    }

    return NextResponse.json({ id: data.id, ...data });
  } catch (e) {
    console.error('jobs/save', e);
    const msg = e instanceof Error ? e.message : 'Failed to save job';
    return err(msg, 500);
  }
}
