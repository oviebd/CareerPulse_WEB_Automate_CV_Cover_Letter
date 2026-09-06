'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Lightbulb, Pencil } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import type { PrepQuestion } from '@/types/interview';

type Props = {
  question: PrepQuestion;
  index: number;
  onSaveAnswer: (questionId: string, answerText: string) => Promise<void>;
  saving?: boolean;
};

function difficultyVariant(difficulty: string | null): 'default' | 'info' | 'warning' | 'danger' {
  if (!difficulty) return 'default';
  const d = difficulty.toLowerCase();
  if (d.includes('easy') || d.includes('low')) return 'info';
  if (d.includes('hard') || d.includes('high')) return 'danger';
  return 'warning';
}

function typeVariant(type: string): 'default' | 'info' | 'success' {
  const t = type.toLowerCase();
  if (t.includes('behavioral') || t.includes('soft')) return 'success';
  if (t.includes('technical') || t.includes('competency')) return 'info';
  return 'default';
}

export function PrepQuestionCard({ question, index, onSaveAnswer, saving }: Props) {
  const reduce = useReducedMotion();
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
    <Card
      padding="sm"
      hoverable
      className="space-y-3 border-[var(--color-border)] transition-colors hover:border-[var(--color-border-hover)]"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-primary-100)] to-[var(--color-primary-200)] text-xs font-bold text-[var(--color-primary)]">
          {index}
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={typeVariant(question.question_type)}>
              {question.question_type.replace(/_/g, ' ')}
            </Badge>
            {question.difficulty ? (
              <Badge variant={difficultyVariant(question.difficulty)}>{question.difficulty}</Badge>
            ) : null}
          </div>
          <p className="text-sm font-medium leading-relaxed text-[var(--color-text-primary)]">
            {question.question_text}
          </p>
          {question.why_selected ? (
            <div className="flex items-start gap-2 rounded-lg border border-[var(--color-border)]/60 bg-[var(--color-surface-faint)] px-3 py-2">
              <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-accent-gold)]" />
              <p className="text-xs leading-relaxed text-[var(--color-muted)]">
                <span className="font-semibold text-[var(--color-text-secondary)]">Why likely: </span>
                {question.why_selected}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {!revealed && !editing ? (
        <Button size="sm" variant="secondary" onClick={() => setRevealed(true)}>
          Reveal answer
        </Button>
      ) : null}

      <AnimatePresence initial={false}>
        {revealed && !editing ? (
          <motion.div
            key="answer"
            initial={reduce ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.24, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="space-y-3 overflow-hidden border-t border-[var(--color-border)] pt-3"
          >
            <div
              className={
                isIrrelevant
                  ? 'rounded-btn border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 text-sm text-[var(--color-muted)]'
                  : 'rounded-btn border border-[var(--color-primary-200)]/40 bg-[var(--color-primary-50)]/50 p-3 text-sm leading-relaxed text-[var(--color-text-secondary)]'
              }
            >
              {question.answer_text}
            </div>
            {question.evidence_from_cv && !isIrrelevant ? (
              <div className="rounded-lg border border-[var(--color-accent-mint)]/25 bg-[var(--color-accent-mint)]/8 px-3 py-2">
                <p className="text-xs leading-relaxed text-[var(--color-text-secondary)]">
                  <span className="font-semibold text-[var(--color-accent-mint)]">CV evidence: </span>
                  {question.evidence_from_cv}
                </p>
              </div>
            ) : null}
            {question.answer_source === 'user' ? (
              <Badge variant="info">Edited by you</Badge>
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
          </motion.div>
        ) : null}
      </AnimatePresence>

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
