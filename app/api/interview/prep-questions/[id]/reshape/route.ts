import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { withInterviewAiRoute } from '@/lib/ai/with-user-route';
import { requireInterviewAccess, err } from '@/lib/interview/api-auth';
import { runReshapePrepQuestion } from '@/lib/interview/orchestrator';
import { handleInterviewApiError } from '@/lib/interview/api-errors';
import {
  PREP_RESHAPE_DRAFT_MAX_CHARS,
  isPrepReshapeLength,
  isPrepReshapeTone,
} from '@/lib/interview/prep-answer';

export const runtime = 'nodejs';
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) return err('Unauthorized', 401);

    const denied = await requireInterviewAccess(user.id);
    if (denied) return denied;

    const { id } = await params;
    let draft = '';
    let tone = 'professional';
    let targetChars = 1000;

    try {
      const body = (await request.json()) as {
        draft?: unknown;
        tone?: unknown;
        target_chars?: unknown;
      };
      if (typeof body.draft === 'string' && body.draft.trim()) {
        draft = body.draft.trim().slice(0, PREP_RESHAPE_DRAFT_MAX_CHARS);
      }
      if (typeof body.tone === 'string' && isPrepReshapeTone(body.tone)) {
        tone = body.tone;
      }
      if (typeof body.target_chars === 'number' && isPrepReshapeLength(body.target_chars)) {
        targetChars = body.target_chars;
      }
    } catch {
      return err('Invalid request body', 422);
    }

    if (!draft) return err('draft is required', 422);

    const result = await withInterviewAiRoute(user.id, undefined, () =>
      runReshapePrepQuestion(user.id, id, { draft, tone, targetChars })
    );
    return NextResponse.json(result);
  } catch (e) {
    console.error('interview/prep-questions/[id]/reshape POST', e);
    if (e instanceof Error && e.message === 'Prep question not found') {
      return err('Not found', 404);
    }
    return handleInterviewApiError(e);
  }
}
