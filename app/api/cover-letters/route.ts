import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getCoverLettersRepo } from '@/lib/db/repositories/cover-letters';

function err(msg: string, code: string | undefined, status: number) {
  return NextResponse.json({ error: msg, code }, { status });
}

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return err('Unauthorized', 'UNAUTHORIZED', 401);

    const url = new URL(request.url);
    const jobId = url.searchParams.get('jobId');
    const data = await getCoverLettersRepo().listByUser(user.id, jobId ?? undefined);
    return NextResponse.json(data ?? []);
  } catch (e) {
    console.error('cover-letters GET', e);
    return err('Failed to list cover letters', 'FETCH_FAILED', 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return err('Unauthorized', 'UNAUTHORIZED', 401);

    const body = (await request.json().catch(() => ({}))) as {
      name?: string | null;
      content?: string;
      tone?: string | null;
      length?: string | null;
      template_id?: string | null;
      specific_emphasis?: string | null;
      company_name?: string | null;
      job_title?: string | null;
      applicant_name?: string | null;
      applicant_role?: string | null;
      applicant_email?: string | null;
      applicant_phone?: string | null;
      applicant_location?: string | null;
      job_ids?: string[];
      source_type?: 'job_description' | 'existing_cover_letter' | 'scratch' | null;
    };
    if (typeof body.content !== 'string') {
      return err('content is required', 'VALIDATION', 422);
    }

    const jobIds = Array.isArray(body.job_ids)
      ? body.job_ids.filter((x): x is string => typeof x === 'string')
      : [];

    const tone =
      typeof body.tone === 'string' && body.tone.trim() ? body.tone.trim() : 'professional';
    const length =
      typeof body.length === 'string' && body.length.trim() ? body.length.trim() : 'medium';

    const data = await getCoverLettersRepo().insert(user.id, {
      ...(body.name?.trim() ? { name: body.name.trim() } : {}),
      content: body.content,
      job_description: '',
      tone,
      length,
      template_id: body.template_id?.trim() || 'cl-classic',
      specific_emphasis: body.specific_emphasis?.trim() || null,
      company_name: body.company_name?.trim() || null,
      job_title: body.job_title?.trim() || null,
      applicant_name: body.applicant_name?.trim() || null,
      applicant_role: body.applicant_role?.trim() || null,
      applicant_email: body.applicant_email?.trim() || null,
      applicant_phone: body.applicant_phone?.trim() || null,
      applicant_location: body.applicant_location?.trim() || null,
      job_ids: jobIds,
      source_type: body.source_type ?? null,
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error('cover-letters POST', e);
    return err('Failed to create cover letter', 'CREATE_FAILED', 500);
  }
}
