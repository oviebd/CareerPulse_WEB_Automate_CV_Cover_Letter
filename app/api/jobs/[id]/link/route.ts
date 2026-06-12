import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return err('Unauthorized', 401);

    const body = (await request.json()) as Partial<LinkBody>;
    const { type, assetId, action } = body;

    if (!type || !assetId || !action) return err('Missing fields', 400);
    if (!['cv', 'cover_letter'].includes(type)) return err('Invalid type', 400);
    if (!['link', 'unlink'].includes(action)) return err('Invalid action', 400);

    const table = type === 'cv' ? 'cvs' : 'cover_letters';

    // Fetch current job_ids of the asset
    const { data: asset, error: fetchErr } = await supabase
      .from(table)
      .select('id, job_ids')
      .eq('id', assetId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchErr) return err('Failed to fetch asset', 500);
    if (!asset) return err('Asset not found', 404);

    const currentIds: string[] = (asset as { job_ids: string[] }).job_ids ?? [];

    let newIds: string[];
    if (action === 'link') {
      if (currentIds.includes(jobId)) {
        return NextResponse.json({ ok: true, job_ids: currentIds }); // already linked
      }
      newIds = [...currentIds, jobId];
    } else {
      newIds = currentIds.filter((id) => id !== jobId);
    }

    const { error: updateErr } = await supabase
      .from(table)
      .update({ job_ids: newIds, updated_at: new Date().toISOString() })
      .eq('id', assetId)
      .eq('user_id', user.id);

    if (updateErr) return err('Failed to update asset', 500);

    return NextResponse.json({ ok: true, job_ids: newIds });
  } catch (e) {
    console.error('jobs link POST', e);
    return err('Server error', 500);
  }
}
