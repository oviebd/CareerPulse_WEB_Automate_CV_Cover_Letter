'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UpgradeCTA } from '@/components/shared/UpgradeCTA';
import { useCoverLettersList, useDeleteCoverLetter, useToggleCoverLetterFavourite } from '@/hooks/useCoverLetters';
import { useSubscription } from '@/hooks/useSubscription';
import { formatDate } from '@/lib/utils';

export default function CoverLettersPage() {
  const { tier } = useSubscription();
  const { data: letters = [], isLoading } = useCoverLettersList();
  const del = useDeleteCoverLetter();
  const fav = useToggleCoverLetterFavourite();
  const isFree = tier === 'free';
  const visible = isFree ? letters.slice(0, 5) : letters;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-bold">Cover letters</h1>
        <Link
          href="/cover-letters/new"
          className="inline-flex rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)]"
        >
          New
        </Link>
      </div>
      {isLoading ? <p className="text-sm text-[var(--color-muted)]">Loading…</p> : null}
      <ul className="space-y-3">
        {visible.map((l) => (
          <li
            key={l.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
          >
            <Link href={`/cover-letters/${l.id}`} className="min-w-0 flex-1">
              <div className="font-medium">{l.company_name || 'Company'}</div>
              <div className="text-sm text-[var(--color-muted)]">{l.job_title || 'Role'}</div>
              <div className="mt-1 text-xs text-[var(--color-muted)]">{formatDate(l.created_at)}</div>
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              {l.ats_score != null ? (
                <Badge variant="success">ATS {l.ats_score}</Badge>
              ) : null}
              <Badge variant="default">{l.tone}</Badge>
              <button
                type="button"
                className="text-lg text-amber-500"
                onClick={() =>
                  fav.mutate({ id: l.id, is_favourited: !l.is_favourited })
                }
              >
                {l.is_favourited ? '★' : '☆'}
              </button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm('Delete this letter?')) del.mutate(l.id);
                }}
              >
                Delete
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {isFree && letters.length > 5 ? (
        <div className="relative rounded-xl border border-dashed border-[var(--color-border)] p-8 text-center">
          <p className="text-sm text-[var(--color-muted)] blur-sm">
            Older letters hidden on Free plan.
          </p>
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <UpgradeCTA />
          </div>
        </div>
      ) : null}
    </div>
  );
}
