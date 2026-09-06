'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RichTextContent } from '@/components/shared/RichTextContent';
import { useToast } from '@/components/ui/toast';
import { useReshapePrepQuestion } from '@/hooks/useInterview';
import {
  PREP_ANSWER_MAX_CHARS,
  PREP_RESHAPE_DRAFT_MAX_CHARS,
  PREP_RESHAPE_LENGTHS,
  PREP_RESHAPE_TONES,
  type PrepReshapeLength,
  type PrepReshapeTone,
} from '@/lib/interview/prep-answer';

const TONE_OPTIONS = PREP_RESHAPE_TONES.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}));

const LENGTH_OPTIONS = PREP_RESHAPE_LENGTHS.map((value) => ({
  value: String(value),
  label: `${value} characters`,
}));

type Props = {
  isOpen: boolean;
  onClose: () => void;
  questionId: string;
  questionText: string;
  initialDraft: string;
  onSave: (answerText: string) => Promise<void>;
  saving?: boolean;
};

export function PrepAnswerReshapeModal({
  isOpen,
  onClose,
  questionId,
  questionText,
  initialDraft,
  onSave,
  saving,
}: Props) {
  const { toast } = useToast();
  const reshape = useReshapePrepQuestion();
  const [draft, setDraft] = useState(initialDraft);
  const [tone, setTone] = useState<PrepReshapeTone>('professional');
  const [targetChars, setTargetChars] = useState<PrepReshapeLength>(1000);
  const [generated, setGenerated] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setDraft(initialDraft);
    setGenerated('');
    setTone('professional');
    setTargetChars(1000);
  }, [isOpen, initialDraft]);

  async function handleGenerate() {
    const trimmed = draft.trim();
    if (!trimmed) {
      toast('Write your answer first.', 'error');
      return;
    }
    try {
      const result = await reshape.mutateAsync({
        questionId,
        draft: trimmed,
        tone,
        target_chars: targetChars,
      });
      setGenerated(result.answer_text);
    } catch {
      toast('Could not reshape the answer. Try again.', 'error');
    }
  }

  async function handleSave() {
    const trimmed = generated.trim();
    if (!trimmed) {
      toast('Generate an answer before saving.', 'error');
      return;
    }
    await onSave(trimmed);
    onClose();
  }

  const resultValue = generated;
  const resultChars = resultValue.length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reshape with AI" className="max-w-2xl">
      <div className="space-y-4">
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-faint)] px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            Question
          </p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-primary)]">
            {questionText}
          </p>
        </div>

        <Textarea
          label="Your answer"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={5}
          maxLength={PREP_RESHAPE_DRAFT_MAX_CHARS}
          placeholder="Write your rough answer — AI will polish it into interview-ready form."
          disabled={reshape.isPending}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Tone"
            value={tone}
            onChange={(e) => setTone(e.target.value as PrepReshapeTone)}
            options={TONE_OPTIONS}
            disabled={reshape.isPending}
          />
          <Select
            label="Answer length"
            value={String(targetChars)}
            onChange={(e) => setTargetChars(Number(e.target.value) as PrepReshapeLength)}
            options={LENGTH_OPTIONS}
            disabled={reshape.isPending}
          />
        </div>

        <Button
          variant="secondary"
          loading={reshape.isPending}
          disabled={!draft.trim()}
          onClick={() => void handleGenerate()}
        >
          Generate answer
        </Button>

        {generated ? (
          <div className="space-y-3 border-t border-[var(--color-border)] pt-4">
            <div className="rounded-lg border border-[var(--color-primary-200)]/40 bg-[var(--color-primary-50)]/50 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-primary)]">
                Preview
              </p>
              <RichTextContent content={generated} />
            </div>
            <Textarea
              label="Edit generated answer"
              value={resultValue}
              onChange={(e) => setGenerated(e.target.value)}
              rows={6}
              maxLength={PREP_ANSWER_MAX_CHARS}
              aria-label="Edit generated answer"
            />
            <p className="text-xs text-[var(--color-muted)]">
              {resultChars} / {PREP_ANSWER_MAX_CHARS} characters
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                loading={saving}
                disabled={!generated.trim() || reshape.isPending}
                onClick={() => void handleSave()}
              >
                Save answer
              </Button>
              <Button variant="ghost" disabled={saving || reshape.isPending} onClick={onClose}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
