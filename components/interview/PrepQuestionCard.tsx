'use client';

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Lightbulb, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RichTextContent } from '@/components/shared/RichTextContent';
import { PrepAnswerReshapeModal } from '@/components/interview/PrepAnswerReshapeModal';
import { displayPrepAnswer } from '@/lib/interview/prep-answer';
import type { PrepQuestion } from '@/types/interview';

type Props = {
  question: PrepQuestion;
  index: number;
  onSaveAnswer: (questionId: string, answerText: string) => Promise<void>;
  saving?: boolean;
  showTopic?: boolean;
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

export function PrepQuestionCard({
  question,
  index,
  onSaveAnswer,
  saving,
  showTopic,
}: Props) {
  const reduce = useReducedMotion();
  const [revealed, setRevealed] = useState(false);
  const [reshapeOpen, setReshapeOpen] = useState(false);
  const answer = displayPrepAnswer(question);
  const isIrrelevant = question.relevance === 'irrelevant';

  async function handleSaveReshaped(answerText: string) {
    await onSaveAnswer(question.id, answerText);
    setRevealed(true);
  }

  return (
    <>
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
              {showTopic && question.topic_name ? (
                <Badge variant="default">{question.topic_name}</Badge>
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

        {!revealed ? (
          <Button size="sm" variant="secondary" onClick={() => setRevealed(true)}>
            Reveal answer
          </Button>
        ) : null}

        <AnimatePresence initial={false}>
          {revealed ? (
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
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-primary)]">
                  Answer
                </p>
                <RichTextContent content={answer} />
              </div>
              {question.evidence_from_cv && !isIrrelevant ? (
                <div className="rounded-lg border border-[var(--color-accent-mint)]/25 bg-[var(--color-accent-mint)]/8 px-3 py-2">
                  <p className="mb-1 text-xs font-semibold text-[var(--color-accent-mint)]">CV evidence</p>
                  <RichTextContent content={question.evidence_from_cv} className="text-xs" />
                </div>
              ) : null}
              {question.answer_source === 'user' ? (
                <Badge variant="info">Edited by you</Badge>
              ) : null}
              <Button
                size="sm"
                variant="ghost"
                icon={<Sparkles className="h-3.5 w-3.5" />}
                onClick={() => setReshapeOpen(true)}
              >
                Reshape with AI
              </Button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </Card>

      <PrepAnswerReshapeModal
        isOpen={reshapeOpen}
        onClose={() => setReshapeOpen(false)}
        questionId={question.id}
        questionText={question.question_text}
        initialDraft={answer}
        onSave={handleSaveReshaped}
        saving={saving}
      />
    </>
  );
}
