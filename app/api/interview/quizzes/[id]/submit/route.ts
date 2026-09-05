import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { withInterviewAiRoute } from '@/lib/ai/with-user-route';
import { requireInterviewAccess, err } from '@/lib/interview/api-auth';
import { runQuizSubmit } from '@/lib/interview/orchestrator';
import { getInterviewRepo } from '@/lib/db/repositories/interview';

export const runtime = 'nodejs';
export const maxDuration = 120;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) return err('Unauthorized', 401);

    const denied = await requireInterviewAccess(user.id);
    if (denied) return denied;

    const { id } = await params;
    const body = (await request.json()) as {
      answers?: Array<{ question_id: string; answer: string }>;
    };
    const answers = body.answers ?? [];
    const quiz = await getInterviewRepo().getQuiz(user.id, id);
    const profileId = quiz?.interview_profile_id as string | undefined;
    const result = await withInterviewAiRoute(user.id, profileId, () =>
      runQuizSubmit(user.id, id, answers)
    );

    const questions = await getInterviewRepo().listQuizQuestions(id);
    const withAnswers = questions.map((q) => ({
      ...q,
    }));

    return NextResponse.json({ ...result, questions: withAnswers });
  } catch (e) {
    console.error('interview/quizzes/submit', e);
    return err('Quiz submission failed.', 500);
  }
}
