'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { useOptimiseEditDraftStore } from '@/stores/useOptimiseEditDraftStore';
import type { CoverLetterTone, CoverLetterLength } from '@/types';

const TONE_OPTIONS: { value: CoverLetterTone; label: string }[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'confident', label: 'Confident' },
  { value: 'creative', label: 'Creative' },
  { value: 'concise', label: 'Concise' },
  { value: 'formal', label: 'Formal' },
];

const LENGTH_OPTIONS: { value: CoverLetterLength; label: string }[] = [
  { value: 'short', label: 'Short (~200 words)' },
  { value: 'medium', label: 'Medium (~350 words)' },
  { value: 'long', label: 'Long (~500 words)' },
];

export default function EnhanceExistingCoverLetterPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [existingContent, setExistingContent] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [targetCompany, setTargetCompany] = useState('');
  const [tone, setTone] = useState<CoverLetterTone>('professional');
  const [length, setLength] = useState<CoverLetterLength>('medium');
  const [emphasis, setEmphasis] = useState('');

  const [enhancing, setEnhancing] = useState(false);
  const [enhancedContent, setEnhancedContent] = useState('');

  const [savingBusy, setSavingBusy] = useState(false);

  const canEnhance = existingContent.trim().length >= 100;
  const canUse = enhancedContent.trim().length > 0;

  async function handleEnhance() {
    if (!canEnhance) return;
    setEnhancing(true);
    setEnhancedContent('');
    try {
      const res = await fetch('/api/cover-letter/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: existingContent.trim(),
          targetRole: targetRole.trim() || undefined,
          targetCompany: targetCompany.trim() || undefined,
          tone,
          length,
          specificEmphasis: emphasis.trim() || undefined,
        }),
      });
      const json = (await res.json()) as { content?: string; error?: string };
      if (!res.ok || !json.content) {
        toast(json.error ?? 'Enhancement failed. Please try again.', 'error');
        return;
      }
      setEnhancedContent(json.content);
    } catch {
      toast('Enhancement failed. Please try again.', 'error');
    } finally {
      setEnhancing(false);
    }
  }

  function handleUseContent() {
    if (!canUse) return;
    setSavingBusy(true);
    useOptimiseEditDraftStore.getState().setClEditDraft({
      content: enhancedContent,
      originalCvId: null,
      companyName: targetCompany.trim() || null,
      jobTitle: targetRole.trim() || null,
      tone,
      length,
      emphasis: emphasis.trim() || null,
      sourceType: 'existing_cover_letter',
    });
    router.push('/cover-letters/draft');
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/cover-letters/new" className="text-sm text-[var(--color-primary)]">
        ← Back
      </Link>
      <div>
        <h1 className="font-display text-2xl font-bold">Enhance Existing Cover Letter</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Paste your existing letter and AI will rewrite it — improving clarity, tone, and impact while preserving your authentic voice.
        </p>
      </div>

      <div className="space-y-4">
        <Textarea
          label="Your existing cover letter"
          placeholder="Paste your cover letter here (minimum 100 characters)…"
          value={existingContent}
          onChange={(e) => setExistingContent(e.target.value)}
          rows={10}
          className="min-h-[200px] font-sans text-sm leading-relaxed"
        />
        {existingContent.trim().length > 0 && existingContent.trim().length < 100 ? (
          <p className="text-xs text-[var(--color-muted)]">
            {100 - existingContent.trim().length} more characters required.
          </p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Target role (optional)"
            placeholder="e.g. Software Engineer"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
          />
          <Input
            label="Target company (optional)"
            placeholder="e.g. Acme Corp"
            value={targetCompany}
            onChange={(e) => setTargetCompany(e.target.value)}
          />
          <Select
            label="Tone"
            name="tone"
            value={tone}
            onChange={(e) => setTone(e.target.value as CoverLetterTone)}
            options={TONE_OPTIONS}
          />
          <Select
            label="Length"
            name="length"
            value={length}
            onChange={(e) => setLength(e.target.value as CoverLetterLength)}
            options={LENGTH_OPTIONS}
          />
          <Input
            label="Special emphasis (optional)"
            placeholder="e.g. leadership experience, remote work"
            value={emphasis}
            onChange={(e) => setEmphasis(e.target.value)}
            className="sm:col-span-2"
          />
        </div>

        <Button
          variant="primary"
          size="sm"
          disabled={!canEnhance}
          loading={enhancing}
          onClick={() => void handleEnhance()}
          className="flex items-center gap-2"
        >
          <Sparkles className="h-4 w-4" />
          Enhance with AI
        </Button>
      </div>

      {enhancedContent ? (
        <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">
            Enhanced version
          </p>
          <Textarea
            value={enhancedContent}
            onChange={(e) => setEnhancedContent(e.target.value)}
            rows={12}
            className="min-h-[220px] font-sans text-sm leading-relaxed"
          />
          <p className="text-xs text-[var(--color-muted)]">
            You can edit the enhanced text above before opening the editor.
          </p>
          <Button
            variant="primary"
            size="sm"
            disabled={!canUse || savingBusy}
            loading={savingBusy}
            onClick={handleUseContent}
          >
            Open in editor →
          </Button>
        </div>
      ) : null}
    </div>
  );
}
