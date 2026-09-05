import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getInterviewRepo } from '@/lib/db/repositories/interview';
import { getJobsRepo } from '@/lib/db/repositories/jobs';
import { err } from '@/lib/interview/api-auth';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return err('Unauthorized', 401);

    const repo = getInterviewRepo();
    const profiles = await repo.listProfiles(user.id);
    const jobs = getJobsRepo();
    const enriched = await Promise.all(
      profiles.map(async (p) => {
        const job = await jobs.getById(user.id, p.job_id as string);
        return {
          ...p,
          job_title: job?.job_title,
          company_name: job?.company_name,
        };
      })
    );
    const eligible_jobs = await repo.listEligibleJobs(user.id);
    return NextResponse.json({ profiles: enriched, eligible_jobs });
  } catch (e) {
    console.error('interview/profiles GET', e);
    return err('Failed to list profiles', 500);
  }
}
