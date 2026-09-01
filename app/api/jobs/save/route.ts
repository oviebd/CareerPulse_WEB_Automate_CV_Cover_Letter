import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import type { Json } from '@/types/database';
import { getJobsRepo } from '@/lib/db/repositories/jobs';
import { getProfilesRepo } from '@/lib/db/repositories/profiles';

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
    const user = await getSessionUser();
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

    const profileRow = await getProfilesRepo().getById(user.id);
    if (!profileRow) {
      return err('Your profile could not be found. Try signing out and back in.', 400);
    }

    const keywordsJson: Json = keywords;

    const data = await getJobsRepo().insert(user.id, {
      job_title,
      company_name,
      job_url,
      keywords: keywordsJson,
      job_summary,
    });

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
