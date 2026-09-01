import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { dbRowToCvProfile } from '@/lib/cv-mapper';
import { mergeAndCompleteCv, normalizeCvPatchBody } from '@/lib/cv-api-merge';
import { stripUndefined } from '@/lib/queries/strip-undefined';
import { optimisedJsonToDbPayload } from '@/lib/optimise-result';
import { CLAUDE_MODEL } from '@/lib/claude';
import { getCvsRepo } from '@/lib/db/repositories/cvs';
import { getCoverLettersRepo } from '@/lib/db/repositories/cover-letters';

type RouteContext = { params: Promise<{ id: string }> };

function err(msg: string, code: string | undefined, status: number) {
  return NextResponse.json({ error: msg, code }, { status });
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    if (!user) return err('Unauthorized', 'UNAUTHORIZED', 401);

    const data = await getCvsRepo().getById(user.id, id);
    if (!data) return err('Not found', 'NOT_FOUND', 404);
    return NextResponse.json(dbRowToCvProfile(data as Record<string, unknown>));
  } catch (e) {
    console.error('cvs GET [id]', e);
    return err('Failed to fetch CV', 'FETCH_FAILED', 500);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    if (!user) return err('Unauthorized', 'UNAUTHORIZED', 401);

    const raw = (await request.json()) as Record<string, unknown>;
    const cvContentRaw = raw.cvContent;
    const coverLetterContentRaw = raw.coverLetterContent;
    delete raw.cvContent;
    delete raw.coverLetterContent;

    const fromCvJson: Record<string, unknown> = {};
    if (typeof cvContentRaw === 'string' && cvContentRaw.trim()) {
      try {
        Object.assign(fromCvJson, optimisedJsonToDbPayload(cvContentRaw));
      } catch {
        return err('Invalid cvContent JSON', 'INVALID_JSON', 422);
      }
    }

    const mergedBody = { ...fromCvJson, ...raw };
    const patch = normalizeCvPatchBody(mergedBody);

    const current = await getCvsRepo().getById(user.id, id);
    if (!current) return err('Not found', 'NOT_FOUND', 404);

    const hasCvPatch = Object.keys(patch).length > 0;
    const hasCl =
      typeof coverLetterContentRaw === 'string' && coverLetterContentRaw.trim().length > 0;

    if (!hasCvPatch && !hasCl) {
      return err('No valid fields', 'NO_FIELDS', 400);
    }

    const wantsMinimal =
      (typeof cvContentRaw === 'string' && cvContentRaw.trim().length > 0) || hasCl;

    let updatedRow: Record<string, unknown> | null = null;

    if (hasCvPatch) {
      const withCompletion = mergeAndCompleteCv(current as Record<string, unknown>, patch);
      const payload = stripUndefined(withCompletion);
      try {
        updatedRow = await getCvsRepo().update(user.id, id, payload);
      } catch (e) {
        console.error('cvs PATCH', e);
        return err('Failed to update CV', 'UPDATE_FAILED', 500);
      }
    }

    const now = new Date().toISOString();
    if (hasCl) {
      const jids = (current.job_ids as string[] | undefined) ?? [];
      const firstJob = jids[0];
      const clContent = (coverLetterContentRaw as string).trim();
      const source = updatedRow ?? (current as Record<string, unknown>);
      const clFields = {
        applicant_name: (source.full_name as string | null) ?? null,
        applicant_role: (source.professional_title as string | null) ?? null,
        applicant_email: (source.email as string | null) ?? null,
        applicant_phone: (source.phone as string | null) ?? null,
        applicant_location: (source.location as string | null) ?? null,
        content: clContent,
        template_id: 'cl-classic',
        generation_model: CLAUDE_MODEL,
      };

      if (firstJob) {
        const existing = await getCoverLettersRepo().listByUser(user.id, firstJob);
        const clRow = existing[0];
        if (clRow?.id) {
          await getCoverLettersRepo().update(user.id, clRow.id as string, {
            content: clContent,
            updated_at: now,
          });
        } else {
          await getCoverLettersRepo().insert(user.id, {
            ...clFields,
            job_ids: [firstJob],
          });
        }
      } else {
        await getCoverLettersRepo().insert(user.id, {
          ...clFields,
          job_ids: [],
        });
      }

      if (!hasCvPatch) {
        try {
          updatedRow = await getCvsRepo().update(user.id, id, { updated_at: now });
        } catch {
          /* keep previous */
        }
      }
    }

    if (!updatedRow && hasCvPatch) {
      return err('Failed to update CV', 'UPDATE_FAILED', 500);
    }
    if (!updatedRow) {
      const refetch = await getCvsRepo().getById(user.id, id);
      if (!refetch) return err('Not found', 'NOT_FOUND', 404);
      updatedRow = refetch as Record<string, unknown>;
    }

    if (wantsMinimal) {
      return NextResponse.json({
        id: String(updatedRow.id),
        updated_at: String(updatedRow.updated_at ?? now),
      });
    }
    return NextResponse.json(dbRowToCvProfile(updatedRow));
  } catch (e) {
    console.error('cvs PATCH', e);
    return err('Failed to update CV', 'UPDATE_FAILED', 500);
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    if (!user) return err('Unauthorized', 'UNAUTHORIZED', 401);

    const url = new URL(request.url);
    const hard = url.searchParams.get('hard') === 'true';

    await getCvsRepo().remove(user.id, id, hard);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('cvs DELETE', e);
    return err('Failed to delete CV', 'DELETE_FAILED', 500);
  }
}
