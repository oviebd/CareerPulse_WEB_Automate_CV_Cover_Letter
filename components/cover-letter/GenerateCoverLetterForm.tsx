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
import { createClient } from '@/lib/supabase/client';
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

  const streamRef = useRef('');
  const rafRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const flushStream = useCallback(() => {
    setStreaming(streamRef.current);
    rafRef.current = null;
  }, []);

  async function generate() {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setStreaming('');
    streamRef.current = '';
    setLetterId(null);
    setAts(null);
    const res = await fetch('/api/generate', {
      method: 'POST',
      signal: abortRef.current.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobDescription,
        companyName,
        jobTitle,
        tone,
        length,
        specificEmphasis: emphasis,
        templateId,
      }),
    });
    if (res.status === 402) {
      const j = await res.json();
      toast(`Limit reached (${j.limit}/month). Upgrade to continue.`, 'error');
      setLoading(false);
      return;
    }
    if (!res.ok || !res.body) {
      toast('Generation failed. Try again.', 'error');
      setLoading(false);
      return;
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    let savedId: string | null = null;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const parts = buf.split('\n\n');
      buf = parts.pop() ?? '';
      for (const block of parts) {
        const line = block.trim();
        if (!line.startsWith('data:')) continue;
        const payload = line.replace(/^data:\s*/, '');
        try {
          const data = JSON.parse(payload) as {
            text?: string;
            done?: boolean;
            id?: string;
            error?: string;
          };
          if (data.text) {
            streamRef.current += data.text;
            if (!rafRef.current) {
              rafRef.current = requestAnimationFrame(flushStream);
            }
          }
          if (data.done && data.id) {
            savedId = data.id;
            setLetterId(data.id);
          }
          if (data.error) {
            toast('Save step failed.', 'error');
          }
        } catch {
          /* ignore partial json */
        }
      }
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setStreaming(streamRef.current);
    setLoading(false);
    if (savedId && canAccessFeature(tier, 'atsAccess')) {
      const supabase = createClient();
      for (let i = 0; i < 8; i++) {
        await new Promise((r) => setTimeout(r, 600));
        const { data } = await supabase
          .from('cover_letters')
          .select('ats_score, ats_summary, ats_keywords_found, ats_keywords_missing')
          .eq('id', savedId)
          .maybeSingle();
        if (data?.ats_score != null) {
          setAts({
            score: data.ats_score,
            summary: data.ats_summary ?? '',
            found: (data.ats_keywords_found as string[]) ?? [],
            missing: (data.ats_keywords_missing as string[]) ?? [],
          });
          break;
        }
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
          disabled={!jobDescription.trim()}
          onClick={() => void generate()}
        >
          Generate
        </Button>
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
          placeholder="Streaming output…"
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
                if (!res.ok) { toast('PDF export failed.', 'error'); return; }
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
                if (!res.ok) { toast('DOCX export failed.', 'error'); return; }
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
        ) : canAccessFeature(tier, 'atsAccess') && letterId && !ats ? (
          <p className="mt-4 text-xs text-[var(--color-muted)]">Calculating ATS score…</p>
        ) : null}
      </div>
    </div>
  );
}
