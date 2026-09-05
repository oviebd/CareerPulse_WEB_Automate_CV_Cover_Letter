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
    const quiz = await getInterviewRepo().getQuiz(user.id, id);
    if (!quiz) return err('Not found', 404);

    const questions = await getInterviewRepo().listQuizQuestions(id);
    const sanitized = questions.map((q) => ({
      ...q,
      correct_answer_json: undefined,
      explanation: undefined,
    }));
    return NextResponse.json({ quiz, questions: sanitized });
  } catch (e) {
    console.error('interview/quizzes/[id] GET', e);
    return err('Failed to load quiz', 500);
  }
}
