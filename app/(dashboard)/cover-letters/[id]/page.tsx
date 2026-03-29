'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCoverLetter } from '@/hooks/useCoverLetters';
import { formatDate } from '@/lib/utils';

export default function CoverLetterDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const { data: letter, isLoading } = useCoverLetter(id);

  if (isLoading) {
    return <p className="text-sm text-[var(--color-muted)]">Loading…</p>;
  }
  if (!letter) {
    return <p className="text-sm">Not found.</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/cover-letters" className="text-sm text-[var(--color-primary)]">
        ← Back
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">
            {letter.company_name || 'Company'}
          </h1>
          <p className="text-[var(--color-muted)]">{letter.job_title}</p>
          <p className="mt-2 text-xs text-[var(--color-muted)]">{formatDate(letter.created_at)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {letter.ats_score != null ? (
            <Badge variant="success">ATS {letter.ats_score}</Badge>
          ) : null}
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              const res = await fetch('/api/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'cover_letter',
                  id: letter.id,
                  templateId: letter.template_id,
                }),
              });
              const j = await res.json();
              if (j.pdfUrl) window.open(j.pdfUrl, '_blank');
            }}
          >
            Export PDF
          </Button>
        </div>
      </div>
      <div className="whitespace-pre-wrap rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-sm">
        {letter.content}
      </div>
    </div>
  );
}
