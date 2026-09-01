import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getCvsRepo } from '@/lib/db/repositories/cvs';
import { getCoverLettersRepo } from '@/lib/db/repositories/cover-letters';
import { getJobsRepo } from '@/lib/db/repositories/jobs';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [cv, coverLetters, jobs] = await Promise.all([
      getCvsRepo().listByUser(user.id, { includeArchived: true }),
      getCoverLettersRepo().listByUser(user.id),
      getJobsRepo().listByUser(user.id),
    ]);

    return NextResponse.json({
      cv,
      cover_letters: coverLetters,
      applications: jobs,
    });
  } catch (e) {
    console.error('account export GET', e);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
