import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { withInterviewAiRoute } from '@/lib/ai/with-user-route';
import { requireInterviewAccess, err } from '@/lib/interview/api-auth';
import { runExplainPrepQuestion } from '@/lib/interview/orchestrator';
import { mapOrchestratorError } from '@/lib/interview/errors';
import { interviewErrorResponse } from '@/lib/interview/api-errors';
import type { PrepExplainTurn } from '@/types/interview';

export const runtime = 'nodejs';
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

const MAX_TURNS = 12;
const MAX_CONTENT = 4000;

function parseHistory(raw: unknown): PrepExplainTurn[] {
  if (!Array.isArray(raw)) return [];
  const turns: PrepExplainTurn[] = [];
  for (const item of raw.slice(-MAX_TURNS)) {
    if (!item || typeof item !== 'object') continue;
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') continue;
    const trimmed = content.trim().slice(0, MAX_CONTENT);
    if (!trimmed) continue;
    turns.push({ role, content: trimmed });
  }
  return turns;
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) return err('Unauthorized', 401);

    const denied = await requireInterviewAccess(user.id);
    if (denied) return denied;

    const { id } = await params;
    let message: string | undefined;
    let history: PrepExplainTurn[] = [];
    try {
      const body = (await request.json()) as { message?: unknown; history?: unknown };
      if (typeof body.message === 'string' && body.message.trim()) {
        message = body.message.trim().slice(0, MAX_CONTENT);
      }
      history = parseHistory(body.history);
    } catch {
      history = [];
    }

    const result = await withInterviewAiRoute(user.id, undefined, () =>
      runExplainPrepQuestion(user.id, id, { message, history })
    );
    return NextResponse.json(result);
  } catch (e) {
    console.error('interview/prep-questions/[id]/explain POST', e);
    if (e instanceof Error && e.message === 'Prep question not found') {
      return err('Not found', 404);
    }
    const mapped = mapOrchestratorError(e);
    return interviewErrorResponse(mapped);
  }
}
