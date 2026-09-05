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
    const session = await getInterviewRepo().getSession(user.id, id);
    if (!session) return err('Not found', 404);

    const questions = await getInterviewRepo().listQuestions(id);
    const current = session.current_question_id
      ? await getInterviewRepo().getQuestion(id, session.current_question_id as string)
      : null;

    let evaluation = null;
    if (current && session.mode === 'practice') {
      evaluation = await getInterviewRepo().getLatestEvaluation(current.id as string);
    }

    const answeredQuestions = await getInterviewRepo().listAnswersForSession(id);

    return NextResponse.json({
      session,
      questions,
      current_question: current,
      latest_evaluation: evaluation,
      answered_questions: answeredQuestions,
    });
  } catch (e) {
    console.error('interview/sessions/[id] GET', e);
    return err('Failed to load session', 500);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) return err('Unauthorized', 401);

    const { id } = await params;
    const body = (await request.json()) as { draft_answer?: string };
    const session = await getInterviewRepo().updateSession(user.id, id, {
      draft_answer: body.draft_answer ?? null,
    });
    return NextResponse.json(session);
  } catch (e) {
    console.error('interview/sessions/[id] PATCH', e);
    return err('Failed to save draft', 500);
  }
}
