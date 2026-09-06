'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RichTextContent } from '@/components/shared/RichTextContent';
import { useExplainPrepQuestion } from '@/hooks/useInterview';
import { ApiError } from '@/lib/api-fetch';

type Turn = {
  role: 'user' | 'assistant';
  content: string;
  input_tokens?: number;
  output_tokens?: number;
};

function formatNum(n: number) {
  return n.toLocaleString();
}

function errorMessage(e: unknown) {
  if (e instanceof ApiError) {
    if (e.code === 'UPGRADE_REQUIRED' || e.status === 403) {
      return 'Interview preparation requires a Pro plan.';
    }
    if (e.status === 429) return 'Too many requests. Please wait a moment and try again.';
    return e.message;
  }
  return 'Could not explain this question. Try again.';
}

export function PrepQuestionExplain({ questionId }: { questionId: string }) {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const explain = useExplainPrepQuestion();

  const sessionIn = turns.reduce((sum, t) => sum + (t.input_tokens ?? 0), 0);
  const sessionOut = turns.reduce((sum, t) => sum + (t.output_tokens ?? 0), 0);
  const lastAssistant = [...turns].reverse().find((t) => t.role === 'assistant');

  async function run(message?: string) {
    const history = turns.map(({ role, content }) => ({ role, content }));
    const result = await explain.mutateAsync({ questionId, message, history });
    const next: Turn[] = [];
    if (message?.trim()) next.push({ role: 'user', content: message.trim() });
    next.push({
      role: 'assistant',
      content: result.explanation,
      input_tokens: result.input_tokens,
      output_tokens: result.output_tokens,
    });
    setTurns((prev) => [...prev, ...next]);
    setDraft('');
  }

  async function handleOpen() {
    setOpen(true);
    if (turns.length === 0 && !explain.isPending) {
      try {
        await run();
      } catch {
        /* error shown via mutation */
      }
    }
  }

  async function handleFollowUp() {
    const message = draft.trim();
    if (!message || explain.isPending) return;
    try {
      await run(message);
    } catch {
      /* error shown via mutation */
    }
  }

  return (
    <div className="space-y-3">
      {!open ? (
        <Button
          size="sm"
          variant="secondary"
          icon={<Sparkles className="h-3.5 w-3.5" />}
          onClick={() => void handleOpen()}
        >
          Explain with AI
        </Button>
      ) : null}

      {open ? (
        <div className="space-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
          <p className="text-xs font-semibold text-[var(--color-text-secondary)]">AI explanation</p>
          <div className="space-y-2">
            {turns.map((turn, i) => (
              <div
                key={`${turn.role}-${i}`}
                className={
                  turn.role === 'user'
                    ? 'rounded-btn bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-text-primary)]'
                    : 'text-sm leading-relaxed text-[var(--color-text-secondary)]'
                }
              >
                {turn.role === 'user' ? (
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                    You
                  </span>
                ) : null}
                {turn.role === 'assistant' ? (
                  <RichTextContent content={turn.content} />
                ) : (
                  <p className="whitespace-pre-wrap">{turn.content}</p>
                )}
              </div>
            ))}
          </div>

          {explain.isPending ? (
            <p className="text-xs text-[var(--color-muted)]">Thinking…</p>
          ) : null}
          {explain.isError ? (
            <div className="space-y-2">
              <p className="text-xs text-[var(--color-danger)]">{errorMessage(explain.error)}</p>
              {turns.length === 0 ? (
                <Button
                  size="sm"
                  variant="secondary"
                  loading={explain.isPending}
                  onClick={() => void run().catch(() => undefined)}
                >
                  Retry
                </Button>
              ) : null}
            </div>
          ) : null}

          {turns.length > 0 || explain.isError ? (
            <div className="space-y-2">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={2}
                placeholder="Ask a follow-up about this question…"
                aria-label="Ask a follow-up about this question"
                disabled={explain.isPending}
              />
              <Button
                size="sm"
                variant="primary"
                loading={explain.isPending}
                disabled={!draft.trim()}
                onClick={() => void handleFollowUp()}
              >
                Ask
              </Button>
            </div>
          ) : null}

          {lastAssistant && (sessionIn > 0 || sessionOut > 0) ? (
            <p className="text-[10px] text-[var(--color-muted)]">
              This reply: {formatNum(lastAssistant.input_tokens ?? 0)} in ·{' '}
              {formatNum(lastAssistant.output_tokens ?? 0)} out
              {turns.filter((t) => t.role === 'assistant').length > 1
                ? ` · Session: ${formatNum(sessionIn)} in · ${formatNum(sessionOut)} out`
                : null}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
