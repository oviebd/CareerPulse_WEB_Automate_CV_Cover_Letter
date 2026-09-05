import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getInterviewRepo } from '@/lib/db/repositories/interview';
import { getProfileDashboard } from '@/lib/interview/orchestrator';
import { err } from '@/lib/interview/api-auth';
import { storageDelete } from '@/lib/storage';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) return err('Unauthorized', 401);

    const { id } = await params;
    const data = await getProfileDashboard(user.id, id);
    return NextResponse.json(data);
  } catch (e) {
    console.error('interview/profiles/[id] GET', e);
    if (e instanceof Error && e.message === 'Profile not found') {
      return err('Not found', 404);
    }
    return err('Failed to load profile', 500);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) return err('Unauthorized', 401);

    const { id } = await params;
    const repo = getInterviewRepo();
    const profile = await repo.getProfileById(user.id, id);
    if (!profile) return err('Not found', 404);

    const audioPaths = await repo.listAudioPathsForProfile(id);
    await Promise.all(
      audioPaths.map((path) => storageDelete('interview-audio', path).catch(() => undefined))
    );
    await repo.deleteProfile(user.id, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('interview/profiles/[id] DELETE', e);
    if (e instanceof Error && e.message === 'Profile not found') {
      return err('Not found', 404);
    }
    return err('Failed to delete preparation', 500);
  }
}
