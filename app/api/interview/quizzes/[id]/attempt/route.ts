import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getInterviewRepo } from '@/lib/db/repositories/interview';
import { err } from '@/lib/interview/api-auth';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) return err('Unauthorized', 401);

    const { id } = await params;
    const repo = getInterviewRepo();
    const quiz = await repo.getQuiz(user.id, id);
    if (!quiz) return err('Not found', 404);

    const attempt = await repo.getInProgressQuizAttempt(user.id, id);
    return NextResponse.json({ attempt });
  } catch (e) {
    console.error('interview/quizzes/[id]/attempt GET', e);
    return err('Failed to load quiz attempt', 500);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) return err('Unauthorized', 401);

    const { id } = await params;
    const body = (await request.json()) as {
      answers?: Record<string, string>;
      current_step?: number;
    };

    const repo = getInterviewRepo();
    const quiz = await repo.getQuiz(user.id, id);
    if (!quiz) return err('Not found', 404);

    let attempt = await repo.getInProgressQuizAttempt(user.id, id);
    const payload = {
      answers_json: {
        answers: body.answers ?? {},
        current_step: body.current_step ?? 0,
      },
      completed_at: null,
    };

    if (attempt) {
      attempt = await repo.updateQuizAttempt(user.id, attempt.id as string, payload);
    } else {
      attempt = await repo.insertQuizAttempt(user.id, id, payload);
    }

    return NextResponse.json({ attempt });
  } catch (e) {
    console.error('interview/quizzes/[id]/attempt PATCH', e);
    return err('Failed to save quiz draft', 500);
  }
}
