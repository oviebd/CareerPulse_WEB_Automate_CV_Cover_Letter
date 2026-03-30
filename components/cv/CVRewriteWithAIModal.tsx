'use client';

import { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional' },
  { value: 'confident', label: 'Confident' },
  { value: 'creative', label: 'Creative' },
  { value: 'concise', label: 'Concise' },
  { value: 'formal', label: 'Formal' },
];

const CHAR_LIMIT_OPTIONS = [
  { value: '50', label: '50 characters' },
  { value: '80', label: '80 characters' },
  { value: '100', label: '100 characters' },
  { value: '150', label: '150 characters' },
  { value: '250', label: '250 characters' },
  { value: '500', label: '500 characters' },
  { value: '1000', label: '1000 characters' },
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
  const [tone, setTone] = useState('professional');
  const [charLimit, setCharLimit] = useState('100');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const disabled = useMemo(() => !sourceText.trim() || loading, [sourceText, loading]);

  async function generateSuggestions() {
    if (!sourceText.trim()) {
      toast('Add text first to rewrite with AI.', 'error');
      return;
    }
    setLoading(true);
    setSuggestions([]);
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
            tone,
            char_limit: charLimit,
            context: extraContext ?? '',
          },
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        result?: { suggestions?: string[] };
      };
      if (!res.ok) {
        if (res.status === 402) {
          toast('Upgrade required for Rewrite with AI.', 'error');
          return;
        }
        toast(json.error ?? 'Failed to generate suggestions.', 'error');
        return;
      }
      const items = (json.result?.suggestions ?? []).filter((s) => s.trim());
      if (!items.length) {
        toast('No suggestions generated. Try changing options.', 'error');
        return;
      }
      setSuggestions(items.slice(0, 3));
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
            label="Tone"
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            options={TONE_OPTIONS}
          />
          <Select
            label="Character limit"
            value={charLimit}
            onChange={(e) => setCharLimit(e.target.value)}
            options={CHAR_LIMIT_OPTIONS}
          />
        </div>

        <Input
          label="Current length"
          readOnly
          value={`${sourceText.trim().length} characters`}
        />

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
                key={`${idx}-${item.slice(0, 30)}`}
                className="rounded-lg border border-[var(--color-border)] p-3"
              >
                <p className="text-sm text-[var(--color-secondary)]">{item}</p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    onSelectSuggestion(item);
                    onClose();
                  }}
                >
                  Use this suggestion
                </Button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
