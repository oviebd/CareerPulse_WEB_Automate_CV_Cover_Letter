import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { computeCompletionPercentage } from '@/lib/cv-completion';
import { resolveEffectiveTier } from '@/lib/dev-subscription';
import { TIER_LIMITS } from '@/types';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    const url = new URL(request.url);
    const coreCvId = url.searchParams.get('core_cv_id');

    const baseQuery = supabase
      .from('cv_profiles')
      .select('*')
      .eq('user_id', user.id);

    const { data, error } = coreCvId
      ? await baseQuery.eq('id', coreCvId).maybeSingle()
      : await baseQuery
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
    if (error) {
      console.error('cv GET', error);
      return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
    }
    return NextResponse.json({ cvProfile: data });
  } catch (e) {
    console.error('cv GET', e);
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const patchBody = (await request.json()) as Record<string, unknown>;
    const coreCvId =
      typeof patchBody.core_cv_id === 'string' ? patchBody.core_cv_id : null;
    const createNew = Boolean(patchBody.create_new);
    const forceOverwriteExisting = Boolean(
      patchBody.force_overwrite_existing
    );

    delete patchBody.core_cv_id;
    delete patchBody.create_new;
    delete patchBody.force_overwrite_existing;

    const patch = patchBody;
    const forbidden = ['id', 'user_id', 'created_at'];
    for (const k of forbidden) delete patch[k];

    if (Array.isArray(patch.referrals)) {
      patch.referrals = patch.referrals.slice(0, 2);
    }
    if (
      patch.section_visibility != null &&
      typeof patch.section_visibility !== 'object'
    ) {
      delete patch.section_visibility;
    }

    const getLatest = async () => {
      const { data: row, error: rowErr } = await supabase
        .from('cv_profiles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (rowErr) throw rowErr;
      return row as Record<string, unknown> | null;
    };

    let current: Record<string, unknown> | null = null;
    if (!createNew) {
      if (coreCvId) {
        const { data: row, error: rowErr } = await supabase
          .from('cv_profiles')
          .select('*')
          .eq('user_id', user.id)
          .eq('id', coreCvId)
          .maybeSingle();
        if (rowErr) throw rowErr;
        current = row ?? null;
      } else {
        current = (await getLatest()) ?? null;
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
      if (forceOverwriteExisting) {
        const { data: prof, error: profErr } = await supabase
          .from('profiles')
          .select('subscription_tier')
          .eq('id', user.id)
          .maybeSingle();
        if (profErr) throw profErr;

        const tier = resolveEffectiveTier(prof?.subscription_tier);
        const uploadLimit = TIER_LIMITS[tier].cvUploads;
        if (uploadLimit !== Number.POSITIVE_INFINITY) {
          const { data: rows } = await supabase
            .from('cv_profiles')
            .select('id')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          // We are about to insert 1 new row, so keep at most
          // (uploadLimit - 1) existing versions to honor the post-insert limit.
          const keepCount = Math.max(0, uploadLimit - 1);
          const keepIds = (rows ?? []).slice(0, keepCount).map((r) => r.id);
          if (keepIds.length > 0) {
            await supabase
              .from('cv_profiles')
              .delete()
              .eq('user_id', user.id)
              .not('id', 'in', keepIds);
          } else {
            await supabase
              .from('cv_profiles')
              .delete()
              .eq('user_id', user.id);
          }
        }
      }

      const { data, error } = await supabase
        .from('cv_profiles')
        .insert({ user_id: user.id, ...payload })
        .select()
        .single();
      if (error) {
        // Fallback for missing columns (e.g. github_url not yet in DB)
        if (error.code === 'PGRST204' || error.message?.includes('column')) {
          const fallbackPayload = { ...payload };
          // List of columns that might be missing in older schemas
          const possiblyMissing = ['github_url', 'linkedin_url', 'links'];
          for (const col of possiblyMissing) {
            if (error.message?.includes(`'${col}'`) || error.details?.includes(`'${col}'`)) {
              delete (fallbackPayload as any)[col];
            }
          }
          // If we deleted something, retry
          if (Object.keys(fallbackPayload).length < Object.keys(payload).length) {
             const { data: retryData, error: retryErr } = await supabase
              .from('cv_profiles')
              .insert({ user_id: user.id, ...fallbackPayload })
              .select()
              .single();
             if (!retryErr) return NextResponse.json({ cvProfile: retryData });
          }
        }
        console.error('cv PATCH insert', error);
        return NextResponse.json({ error: 'update_failed' }, { status: 500 });
      }
      return NextResponse.json({ cvProfile: data });
    }

    const targetId =
      (coreCvId ?? (current?.id as string | undefined)) || undefined;
    if (!targetId) {
      // Shouldn't happen, but fallback to insert.
      const { data, error } = await supabase
        .from('cv_profiles')
        .insert({ user_id: user.id, ...payload })
        .select()
        .single();
      if (error) {
        console.error('cv PATCH insert fallback', error);
        return NextResponse.json({ error: 'update_failed' }, { status: 500 });
      }
      return NextResponse.json({ cvProfile: data });
    }

    const { data, error } = await supabase
      .from('cv_profiles')
      .update(payload)
      .eq('user_id', user.id)
      .eq('id', targetId)
      .select()
      .single();

    if (error) {
      // Fallback for missing columns on update
      if (error.code === 'PGRST204' || error.message?.includes('column')) {
        const fallbackPayload = { ...payload };
        const possiblyMissing = ['github_url', 'linkedin_url', 'links'];
        for (const col of possiblyMissing) {
          if (error.message?.includes(`'${col}'`) || error.details?.includes(`'${col}'`)) {
            delete (fallbackPayload as any)[col];
          }
        }
        if (Object.keys(fallbackPayload).length < Object.keys(payload).length) {
           const { data: retryData, error: retryErr } = await supabase
            .from('cv_profiles')
            .update(fallbackPayload)
            .eq('user_id', user.id)
            .eq('id', targetId)
            .select()
            .single();
           if (!retryErr) return NextResponse.json({ cvProfile: retryData });
        }
      }
      console.error('cv PATCH', error);
      return NextResponse.json({ error: 'update_failed' }, { status: 500 });
    }
    return NextResponse.json({ cvProfile: data });
  } catch (e) {
    console.error('cv PATCH', e);
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }
}
