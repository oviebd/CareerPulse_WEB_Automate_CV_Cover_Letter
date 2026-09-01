import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { computeCompletionPercentage } from '@/lib/cv-completion';
import { resolveEffectiveTier } from '@/lib/dev-subscription';
import { TIER_LIMITS } from '@/types';
import { getCvsRepo } from '@/lib/db/repositories/cvs';
import { getProfilesRepo } from '@/lib/db/repositories/profiles';

function pickLatest(rows: Record<string, unknown>[]) {
  return rows[0] ?? null;
}

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    const url = new URL(request.url);
    const coreCvId = url.searchParams.get('core_cv_id');

    const data = coreCvId
      ? await getCvsRepo().getById(user.id, coreCvId)
      : pickLatest(await getCvsRepo().listByUser(user.id, { includeArchived: true }));

    return NextResponse.json({ cvProfile: data });
  } catch (e) {
    console.error('cv GET', e);
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const patchBody = (await request.json()) as Record<string, unknown>;
    const coreCvId =
      typeof patchBody.core_cv_id === 'string' ? patchBody.core_cv_id : null;
    const createNew = Boolean(patchBody.create_new);
    const forceOverwriteExisting = Boolean(patchBody.force_overwrite_existing);

    delete patchBody.core_cv_id;
    delete patchBody.create_new;
    delete patchBody.force_overwrite_existing;

    const patch = patchBody;
    if (patch.preferred_cv_template_id && patch.preferred_template_id === undefined) {
      patch.preferred_template_id = patch.preferred_cv_template_id;
      delete patch.preferred_cv_template_id;
    }
    delete patch.preferred_cl_template_id;

    const forbidden = ['id', 'user_id', 'created_at'];
    for (const k of forbidden) delete patch[k];

    if (Array.isArray(patch.referrals)) {
      patch.referrals = patch.referrals.slice(0, 2);
    }
    if (patch.section_visibility != null && typeof patch.section_visibility !== 'object') {
      delete patch.section_visibility;
    }

    let current: Record<string, unknown> | null = null;
    if (!createNew) {
      if (coreCvId) {
        current = (await getCvsRepo().getById(user.id, coreCvId)) ?? null;
      } else {
        current = pickLatest(await getCvsRepo().listByUser(user.id, { includeArchived: true }));
      }
    }

    const merged = { ...(current ?? {}), ...patch } as Parameters<
      typeof computeCompletionPercentage
    >[0];
    const { percentage, isComplete } = computeCompletionPercentage(merged);

    const payload = {
      ...patch,
      completion_percentage: percentage,
      is_complete: isComplete,
    };

    if (createNew || !current) {
      const p = payload as Record<string, unknown>;
      if (!p.name || !String(p.name).trim()) {
        const fn = typeof p.full_name === 'string' ? p.full_name.trim() : '';
        p.name = fn || 'Untitled CV';
      }
      if (forceOverwriteExisting) {
        const prof = await getProfilesRepo().getById(user.id);
        const tier = resolveEffectiveTier(prof?.subscription_tier);
        const uploadLimit = TIER_LIMITS[tier].cvUploads;
        if (uploadLimit !== Number.POSITIVE_INFINITY) {
          const rows = await getCvsRepo().listByUser(user.id, { includeArchived: true });
          const keepCount = Math.max(0, uploadLimit - 1);
          const keepIds = new Set(rows.slice(0, keepCount).map((r) => r.id as string));
          for (const row of rows) {
            const rid = row.id as string;
            if (!keepIds.has(rid)) {
              await getCvsRepo().remove(user.id, rid, true);
            }
          }
        }
      }

      try {
        const data = await getCvsRepo().insert(user.id, payload);
        return NextResponse.json({ cvProfile: data });
      } catch (error) {
        const msg = error instanceof Error ? error.message : '';
        if (msg.includes('column')) {
          const fallbackPayload = { ...payload };
          const possiblyMissing = ['github_url', 'linkedin_url', 'links'];
          for (const col of possiblyMissing) {
            if (msg.includes(`'${col}'`)) {
              delete (fallbackPayload as Record<string, unknown>)[col];
            }
          }
          if (Object.keys(fallbackPayload).length < Object.keys(payload).length) {
            try {
              const retryData = await getCvsRepo().insert(user.id, fallbackPayload);
              return NextResponse.json({ cvProfile: retryData });
            } catch {
              /* fall through */
            }
          }
        }
        console.error('cv PATCH insert', error);
        return NextResponse.json({ error: 'update_failed' }, { status: 500 });
      }
    }

    const targetId = (coreCvId ?? (current?.id as string | undefined)) || undefined;
    if (!targetId) {
      try {
        const data = await getCvsRepo().insert(user.id, payload);
        return NextResponse.json({ cvProfile: data });
      } catch (error) {
        console.error('cv PATCH insert fallback', error);
        return NextResponse.json({ error: 'update_failed' }, { status: 500 });
      }
    }

    try {
      const data = await getCvsRepo().update(user.id, targetId, payload);
      return NextResponse.json({ cvProfile: data });
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      if (msg.includes('column')) {
        const fallbackPayload = { ...payload };
        const possiblyMissing = ['github_url', 'linkedin_url', 'links'];
        for (const col of possiblyMissing) {
          if (msg.includes(`'${col}'`)) {
            delete (fallbackPayload as Record<string, unknown>)[col];
          }
        }
        if (Object.keys(fallbackPayload).length < Object.keys(payload).length) {
          try {
            const retryData = await getCvsRepo().update(user.id, targetId, fallbackPayload);
            return NextResponse.json({ cvProfile: retryData });
          } catch {
            /* fall through */
          }
        }
      }
      console.error('cv PATCH', error);
      return NextResponse.json({ error: 'update_failed' }, { status: 500 });
    }
  } catch (e) {
    console.error('cv PATCH', e);
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }
}
