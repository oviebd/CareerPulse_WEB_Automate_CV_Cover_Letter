'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/components/ui/toast';
import { canAccessFeature } from '@/lib/subscription';
import type { CoverLetterLength, CoverLetterTone } from '@/types';

const TONES: { id: CoverLetterTone; label: string }[] = [
  { id: 'professional', label: 'Professional' },
  { id: 'confident', label: 'Confident' },
  { id: 'creative', label: 'Creative' },
  { id: 'concise', label: 'Concise' },
  { id: 'formal', label: 'Formal' },
];

export function GenerateCoverLetterForm() {
  const { toast } = useToast();
  const { tier } = useSubscription();
  const [jobDescription, setJd] = useState('');
  const [companyName, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [tone, setTone] = useState<CoverLetterTone>('professional');
  const [length, setLength] = useState<CoverLetterLength>('medium');
  const [emphasis, setEmphasis] = useState('');
  const [templateId, setTemplateId] = useState('cl-classic');
  const [streaming, setStreaming] = useState('');
  const [loading, setLoading] = useState(false);
  const [letterId, setLetterId] = useState<string | null>(null);
  const [ats, setAts] = useState<{
    score: number;
    summary: string;
    found: string[];
    missing: string[];
  } | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  async function generate() {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setStreaming('');
    setLetterId(null);
    setAts(null);
    const res = await fetch('/api/cv/optimise', {
      method: 'POST',
      signal: abortRef.current.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_description: jobDescription.trim(),
        company_name: companyName.trim() || undefined,
        job_title: jobTitle.trim() || undefined,
        generationType: 'coverLetter',
        tone,
        length,
        specific_emphasis: emphasis.trim() || undefined,
      }),
    });
    if (res.status === 403) {
      const j = await res.json().catch(() => ({}));
      toast(
        typeof j.message === 'string' ? j.message : 'Upgrade required for this feature.',
        'error'
      );
      setLoading(false);
      return;
    }
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast(typeof j.error === 'string' ? j.error : 'Generation failed. Try again.', 'error');
      setLoading(false);
      return;
    }
    const data = (await res.json()) as { coverLetter?: string };
    const text = data.coverLetter?.trim() ?? '';
    setStreaming(text);
    setLoading(false);

    if (text && canAccessFeature(tier, 'atsAccess')) {
      try {
        const scoreRes = await fetch('/api/cover-letter/score-ats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobDescription, coverLetter: text }),
        });
        if (scoreRes.ok) {
          const atsData = (await scoreRes.json()) as {
            score: number;
            summary: string;
            found: string[];
            missing: string[];
          };
          setAts({
            score: atsData.score,
            summary: atsData.summary,
            found: atsData.found,
            missing: atsData.missing,
          });
        }
      } catch {
        /* optional ATS */
      }
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-4">
        <Textarea
          label="Job description"
          value={jobDescription}
          onChange={(e) => setJd(e.target.value)}
          className="min-h-[200px]"
        />
        <Input
          label="Company name (optional)"
          helperText="Auto-detected if left blank in the letter context"
          value={companyName}
          onChange={(e) => setCompany(e.target.value)}
        />
        <Input label="Job title (optional)" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
        <div>
          <span className="mb-2 block text-sm font-medium">Tone</span>
          <div className="flex flex-wrap gap-2">
            {TONES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTone(t.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  tone === t.id
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="mb-2 block text-sm font-medium">Length</span>
          <div className="flex gap-4 text-sm">
            {(['short', 'medium', 'long'] as CoverLetterLength[]).map((l) => (
              <label key={l} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="len"
                  checked={length === l}
                  onChange={() => setLength(l)}
                />
                {l}
              </label>
            ))}
          </div>
        </div>
        <Textarea
          label="Specific emphasis (optional)"
          value={emphasis}
          onChange={(e) => setEmphasis(e.target.value)}
        />
        <Input
          label="Template ID"
          helperText="e.g. cl-classic, cl-modern"
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
        />
        <Button
          variant="primary"
          loading={loading}
          disabled={!jobDescription.trim() || jobDescription.trim().length < 100}
          onClick={() => void generate()}
        >
          Generate
        </Button>
        {streaming.trim() && !letterId ? (
          <Button
            variant="secondary"
            onClick={async () => {
              const res = await fetch('/api/cover-letters', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: `${jobTitle || 'Role'} — ${companyName || 'Company'}`.slice(0, 200),
                  content: streaming,
                  tone,
                  length,
                  template_id: templateId,
                  specific_emphasis: emphasis.trim() || null,
                }),
              });
              if (!res.ok) {
                toast('Could not save cover letter.', 'error');
                return;
              }
              const data = (await res.json()) as { id: string };
              setLetterId(data.id);
              toast('Saved to your cover letters.', 'success');
            }}
          >
            Save to library
          </Button>
        ) : null}
      </div>
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        {!streaming && !loading ? (
          <p className="text-sm text-[var(--color-muted)]">Your cover letter will appear here.</p>
        ) : null}
        {loading && !streaming ? <Progress value={30} className="mb-4" /> : null}
        <textarea
          className="min-h-[320px] w-full resize-y rounded-lg border border-[var(--color-border)] p-3 text-sm"
          value={streaming}
          readOnly
          placeholder="Generated cover letter…"
        />
        {letterId ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                void navigator.clipboard.writeText(streaming);
                toast('Copied.', 'success');
              }}
            >
              Copy
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                const res = await fetch('/api/export', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    type: 'cover_letter',
                    id: letterId,
                    templateId,
                  }),
                });
                if (!res.ok) {
                  toast('PDF export failed.', 'error');
                  return;
                }
                const j = await res.json();
                if (j.pdfUrl) window.open(j.pdfUrl, '_blank');
              }}
            >
              PDF
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                const res = await fetch('/api/export', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    type: 'cover_letter',
                    id: letterId,
                    templateId,
                    format: 'docx',
                  }),
                });
                if (!res.ok) {
                  toast('DOCX export failed.', 'error');
                  return;
                }
                const j = await res.json();
                if (j.docxUrl) window.open(j.docxUrl, '_blank');
              }}
            >
              DOCX
            </Button>
          </div>
        ) : null}
        {canAccessFeature(tier, 'atsAccess') && ats ? (
          <div className="mt-6 border-t border-[var(--color-border)] pt-4">
            <div className="flex items-center gap-3">
              <Badge
                variant={
                  ats.score >= 70 ? 'success' : ats.score >= 40 ? 'warning' : 'danger'
                }
              >
                ATS {ats.score}
              </Badge>
              <p className="text-sm text-[var(--color-muted)]">{ats.summary}</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {ats.found.map((k) => (
                <Badge key={k} variant="success">
                  {k}
                </Badge>
              ))}
              {ats.missing.map((k) => (
                <Badge key={k} variant="warning">
                  {k}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
