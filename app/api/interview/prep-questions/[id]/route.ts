import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getInterviewRepo } from '@/lib/db/repositories/interview';
import { err } from '@/lib/interview/api-auth';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) return err('Unauthorized', 401);

    const { id } = await params;
    const body = (await request.json()) as { answer_text?: string };
    const answerText = body.answer_text?.trim();
    if (!answerText) return err('answer_text is required', 422);

    const updated = await getInterviewRepo().updatePrepQuestionAnswer(user.id, id, answerText);
    return NextResponse.json(updated);
  } catch (e) {
    console.error('interview/prep-questions/[id] PATCH', e);
    if (e instanceof Error && e.message === 'Prep question not found') {
      return err('Not found', 404);
    }
    return err('Failed to update answer', 500);
  }
}
