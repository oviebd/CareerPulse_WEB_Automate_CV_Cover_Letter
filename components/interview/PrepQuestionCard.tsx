'use client';

import { useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { PrepQuestion } from '@/types/interview';

type Props = {
  question: PrepQuestion;
  index: number;
  onSaveAnswer: (questionId: string, answerText: string) => Promise<void>;
  saving?: boolean;
};

export function PrepQuestionCard({ question, index, onSaveAnswer, saving }: Props) {
  const [revealed, setRevealed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(question.answer_text);

  useEffect(() => {
    setDraft(question.answer_text);
  }, [question.answer_text]);

  const isIrrelevant = question.relevance === 'irrelevant';

  async function handleSave() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    await onSaveAnswer(question.id, trimmed);
    setEditing(false);
    setRevealed(true);
  }

  function handleCancelEdit() {
    setDraft(question.answer_text);
    setEditing(false);
  }

  return (
    <Card padding="sm" className="space-y-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-100)] text-xs font-semibold text-[var(--color-primary)]">
          {index}
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[var(--color-surface-2)] px-2 py-0.5 text-xs text-[var(--color-muted)]">
              {question.question_type}
            </span>
            {question.difficulty ? (
              <span className="rounded-full bg-[var(--color-surface-2)] px-2 py-0.5 text-xs text-[var(--color-muted)]">
                {question.difficulty}
              </span>
            ) : null}
          </div>
          <p className="text-sm font-medium text-[var(--color-text-primary)]">
            {question.question_text}
          </p>
          {question.why_selected ? (
            <p className="text-xs text-[var(--color-muted)]">
              Why likely: {question.why_selected}
            </p>
          ) : null}
        </div>
      </div>

      {!revealed && !editing ? (
        <Button size="sm" variant="secondary" onClick={() => setRevealed(true)}>
          Answer
        </Button>
      ) : null}

      {revealed && !editing ? (
        <div className="space-y-3 border-t border-[var(--color-border)] pt-3">
          <div
            className={
              isIrrelevant
                ? 'rounded-btn border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 text-sm text-[var(--color-muted)]'
                : 'rounded-btn border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 text-sm text-[var(--color-text-secondary)]'
            }
          >
            {question.answer_text}
          </div>
          {question.evidence_from_cv && !isIrrelevant ? (
            <p className="text-xs text-[var(--color-muted)]">
              CV evidence: {question.evidence_from_cv}
            </p>
          ) : null}
          {question.answer_source === 'user' ? (
            <p className="text-xs text-[var(--color-muted)]">Edited by you</p>
          ) : null}
          <Button
            size="sm"
            variant="ghost"
            icon={<Pencil className="h-3.5 w-3.5" />}
            onClick={() => {
              setDraft(question.answer_text);
              setEditing(true);
            }}
          >
            Edit
          </Button>
        </div>
      ) : null}

      {editing ? (
        <div className="space-y-3 border-t border-[var(--color-border)] pt-3">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={5}
            aria-label="Edit suggested answer"
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="primary" loading={saving} onClick={() => void handleSave()}>
              Save
            </Button>
            <Button size="sm" variant="ghost" disabled={saving} onClick={handleCancelEdit}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
