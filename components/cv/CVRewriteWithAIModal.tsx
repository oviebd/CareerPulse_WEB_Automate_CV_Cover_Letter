'use client';

import { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional' },
  { value: 'confident', label: 'Confident' },
  { value: 'motivated', label: 'Motivated' },
  { value: 'positive', label: 'Positive' },
  { value: 'natural_human', label: 'Natural & Human' },
  { value: 'achievement_focused', label: 'Achievement Focused' },
  { value: 'creative', label: 'Creative' },
  { value: 'concise', label: 'Concise' },
  { value: 'formal', label: 'Formal' },
];

const WORD_LIMIT_OPTIONS = [
  { value: '10', label: '10 words' },
  { value: '30', label: '30 words' },
  { value: '60', label: '60 words' },
  { value: '100', label: '100 words' },
  { value: '150', label: '150 words' },
  { value: '200', label: '200 words' },
  { value: 'other', label: 'Other (custom)' },
];

interface CVRewriteWithAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  section: string;
  inputLabel: string;
  sourceText: string;
  extraContext?: string;
  onSelectSuggestion: (value: string) => void;
}

type AISuggestion = {
  text: string;
  tone: string;
  why: string;
};

export function CVRewriteWithAIModal({
  isOpen,
  onClose,
  section,
  inputLabel,
  sourceText,
  extraContext,
  onSelectSuggestion,
}: CVRewriteWithAIModalProps) {
  const { toast } = useToast();
  const [selectedTones, setSelectedTones] = useState<string[]>(['professional']);
  const [wordLimitPreset, setWordLimitPreset] = useState('100');
  const [customWordLimit, setCustomWordLimit] = useState('100');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [bestIndex, setBestIndex] = useState<number | null>(null);
  const [bestReason, setBestReason] = useState('');

  const disabled = useMemo(() => !sourceText.trim() || loading, [sourceText, loading]);
  const currentWordCount = useMemo(
    () => sourceText.trim().split(/\s+/).filter(Boolean).length,
    [sourceText]
  );

  const activeWordLimit = useMemo(
    () => (wordLimitPreset === 'other' ? customWordLimit : wordLimitPreset),
    [wordLimitPreset, customWordLimit]
  );

  function toggleTone(toneValue: string) {
    setSelectedTones((prev) => {
      if (prev.includes(toneValue)) {
        if (prev.length === 1) return prev;
        return prev.filter((t) => t !== toneValue);
      }
      return [...prev, toneValue];
    });
  }

  async function generateSuggestions() {
    if (!sourceText.trim()) {
      toast('Add text first to rewrite with AI.', 'error');
      return;
    }
    const parsedWordLimit = Number(activeWordLimit);
    if (!Number.isFinite(parsedWordLimit) || parsedWordLimit < 5 || parsedWordLimit > 500) {
      toast('Word count must be between 5 and 500.', 'error');
      return;
    }
    setLoading(true);
    setSuggestions([]);
    setBestIndex(null);
    setBestReason('');
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'cv_rewrite_suggestions',
          payload: {
            section,
            input_label: inputLabel,
            text: sourceText,
            tones: selectedTones,
            word_limit: String(parsedWordLimit),
            context: extraContext ?? '',
          },
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        result?: {
          suggestions?: Array<string | { text?: string; tone?: string; why?: string }>;
          best_index?: number;
          best_reason?: string;
        };
      };
      if (!res.ok) {
        if (res.status === 402) {
          toast('Upgrade required for Rewrite with AI.', 'error');
          return;
        }
        toast(json.error ?? 'Failed to generate suggestions.', 'error');
        return;
      }
      const items = (json.result?.suggestions ?? [])
        .map((item) => {
          if (typeof item === 'string') {
            return { text: item, tone: 'Professional', why: 'Clear rewrite.' };
          }
          return {
            text: item.text ?? '',
            tone: item.tone ?? 'Professional',
            why: item.why ?? 'Clear rewrite.',
          };
        })
        .filter((s) => s.text.trim());
      if (!items.length) {
        toast('No suggestions generated. Try changing options.', 'error');
        return;
      }
      setSuggestions(items.slice(0, 3));
      setBestIndex(
        typeof json.result?.best_index === 'number' &&
          json.result.best_index >= 0 &&
          json.result.best_index < 3
          ? json.result.best_index
          : null
      );
      setBestReason((json.result?.best_reason ?? '').trim());
    } catch {
      toast('Failed to generate suggestions.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Rewrite with AI">
      <div className="space-y-4">
        <p className="text-sm text-[var(--color-muted)]">
          Generate section-specific suggestions for <strong>{section}</strong> -{' '}
          <strong>{inputLabel}</strong>.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Word count"
            value={wordLimitPreset}
            onChange={(e) => setWordLimitPreset(e.target.value)}
            options={WORD_LIMIT_OPTIONS}
          />
          {wordLimitPreset === 'other' ? (
            <Input
              label="Custom word count"
              type="number"
              min={5}
              max={500}
              step={1}
              value={customWordLimit}
              onChange={(e) => setCustomWordLimit(e.target.value)}
            />
          ) : (
            <Input
              label="Current length"
              readOnly
              value={`${currentWordCount} words`}
            />
          )}
        </div>

        <div>
          <p className="mb-1 block text-sm font-medium text-[var(--color-text-primary)]">Tone (multi-select)</p>
          <div className="flex flex-wrap gap-2">
            {TONE_OPTIONS.map((tone) => {
              const active = selectedTones.includes(tone.value);
              return (
                <button
                  key={tone.value}
                  type="button"
                  onClick={() => toggleTone(tone.value)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-sm transition',
                    active
                      ? 'border-[var(--color-primary-400)]/50 bg-[var(--color-primary-100)]/50 text-[var(--color-primary-400)]'
                      : 'border-[var(--color-border)] bg-[var(--color-input-bg)] text-[var(--color-text-primary)] hover:bg-white/[0.06]'
                  )}
                  aria-pressed={active}
                >
                  {tone.label}
                </button>
              );
            })}
          </div>
        </div>

        <Button
          variant="primary"
          onClick={() => void generateSuggestions()}
          loading={loading}
          disabled={disabled}
        >
          Generate 3 suggestions
        </Button>

        {suggestions.length > 0 ? (
          <div className="space-y-2">
            {suggestions.map((item, idx) => (
              <div
                key={`${idx}-${item.text.slice(0, 30)}`}
                className="rounded-lg border border-[var(--color-border)] p-3"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[var(--color-primary-200)]/40 bg-[var(--color-primary-100)]/40 px-2 py-0.5 text-xs font-medium text-[var(--color-primary-400)]">
                    {item.tone}
                  </span>
                  {bestIndex === idx ? (
                    <span className="rounded-full border border-[var(--color-accent-mint)]/40 bg-[var(--color-accent-mint)]/15 px-2 py-0.5 text-xs font-medium text-[var(--color-accent-mint)]">
                      AI pick
                    </span>
                  ) : null}
                </div>
                <p className="whitespace-pre-wrap text-sm text-[var(--color-text-primary)]">{item.text}</p>
                <p className="mt-2 text-xs text-[var(--color-muted)]">{item.why}</p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    onSelectSuggestion(item.text);
                    onClose();
                  }}
                >
                  Use this suggestion
                </Button>
              </div>
            ))}
            {bestReason ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                <strong>AI recommendation:</strong> {bestReason}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
