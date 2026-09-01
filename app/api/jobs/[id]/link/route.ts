import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getCoverLettersRepo } from '@/lib/db/repositories/cover-letters';
import { getCvsRepo } from '@/lib/db/repositories/cvs';

type RouteContext = { params: Promise<{ id: string }> };
type AssetType = 'cv' | 'cover_letter';
type Action = 'link' | 'unlink';

interface LinkBody {
  type: AssetType;
  assetId: string;
  action: Action;
}

function err(msg: string, status: number) {
  return NextResponse.json({ error: msg }, { status });
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id: jobId } = await params;
    const user = await getSessionUser();
    if (!user) return err('Unauthorized', 401);

    const body = (await request.json()) as Partial<LinkBody>;
    const { type, assetId, action } = body;

    if (!type || !assetId || !action) return err('Missing fields', 400);
    if (!['cv', 'cover_letter'].includes(type)) return err('Invalid type', 400);
    if (!['link', 'unlink'].includes(action)) return err('Invalid action', 400);

    const asset =
      type === 'cv'
        ? await getCvsRepo().getById(user.id, assetId)
        : await getCoverLettersRepo().getById(user.id, assetId);

    if (!asset) return err('Asset not found', 404);

    const currentIds: string[] = (asset.job_ids as string[] | undefined) ?? [];

    let newIds: string[];
    if (action === 'link') {
      if (currentIds.includes(jobId)) {
        return NextResponse.json({ ok: true, job_ids: currentIds });
      }
      newIds = [...currentIds, jobId];
    } else {
      newIds = currentIds.filter((id) => id !== jobId);
    }

    const patch = { job_ids: newIds, updated_at: new Date().toISOString() };
    try {
      if (type === 'cv') {
        await getCvsRepo().update(user.id, assetId, patch);
      } else {
        await getCoverLettersRepo().update(user.id, assetId, patch);
      }
    } catch {
      return err('Failed to update asset', 500);
    }

    return NextResponse.json({ ok: true, job_ids: newIds });
  } catch (e) {
    console.error('jobs link POST', e);
    return err('Server error', 500);
  }
}
