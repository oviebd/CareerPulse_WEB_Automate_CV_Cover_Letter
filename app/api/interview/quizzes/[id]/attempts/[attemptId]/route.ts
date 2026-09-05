import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getInterviewRepo } from '@/lib/db/repositories/interview';
import { err } from '@/lib/interview/api-auth';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string; attemptId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) return err('Unauthorized', 401);

    const { id, attemptId } = await params;
    const repo = getInterviewRepo();
    const attempt = await repo.getQuizAttemptById(user.id, id, attemptId);
    if (!attempt) return err('Not found', 404);
    const attemptRow = attempt as Record<string, unknown>;
    if (!attemptRow.completed_at) return err('Attempt not completed', 422);

    const questions = await repo.listQuizQuestions(id);
    const evaluations = Array.isArray(attemptRow.evaluation_json)
      ? (attemptRow.evaluation_json as Array<Record<string, unknown>>)
      : [];

    const review = questions.map((q) => {
      const evaluation = evaluations.find((e) => e.question_id === q.id) ?? {};
      const answers = Array.isArray(attemptRow.answers_json)
        ? (attemptRow.answers_json as Array<{ question_id: string; answer: string }>)
        : [];
      const userAnswer =
        (evaluation.user_answer as string | undefined) ??
        answers.find((a) => a.question_id === q.id)?.answer ??
        '';

      return {
        id: q.id,
        question_type: q.question_type,
        question_text: q.question_text,
        options_json: q.options_json,
        user_answer: userAnswer,
        correct_answer: q.correct_answer_json,
        explanation: q.explanation,
        correct: evaluation.correct ?? false,
        score: evaluation.score ?? 0,
      };
    });

    return NextResponse.json({
      attempt: {
        id: attemptRow.id,
        quiz_id: attemptRow.quiz_id,
        quiz_title: attemptRow.quiz_title,
        score: attemptRow.score,
        completed_at: attemptRow.completed_at,
        started_at: attemptRow.started_at,
      },
      review,
    });
  } catch (e) {
    console.error('interview/quizzes/[id]/attempts/[attemptId] GET', e);
    return err('Failed to load quiz attempt', 500);
  }
}
