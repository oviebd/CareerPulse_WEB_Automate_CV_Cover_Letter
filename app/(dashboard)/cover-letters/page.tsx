'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { LayoutTemplate, Star, PenLine, Copy, FileSearch } from 'lucide-react';
import { ATSBadge } from '@/components/shared/ATSBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UpgradeCTA } from '@/components/shared/UpgradeCTA';
import { useCoverLettersList, useDeleteCoverLetter, useToggleCoverLetterFavourite } from '@/hooks/useCoverLetters';
import { useSubscription } from '@/hooks/useSubscription';
import { formatDate } from '@/lib/utils';

const SOURCE_LABEL: Record<string, string> = {
  scratch: 'From scratch',
  existing_cover_letter: 'From existing',
  job_description: 'From JD',
};

const SOURCE_COLOR: Record<string, string> = {
  scratch: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  existing_cover_letter: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  job_description: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
};

export default function CoverLettersPage() {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const { tier } = useSubscription();
  const { data: letters = [], isLoading } = useCoverLettersList();
  const del = useDeleteCoverLetter();
  const fav = useToggleCoverLetterFavourite();
  const isFree = tier === 'free';
  const visible = isFree ? letters.slice(0, 5) : letters;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-bold">Cover Letters</h1>
        <Link
          href="/cover-letters/templates"
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold text-[var(--color-secondary)] hover:bg-[var(--color-surface-2)]"
        >
          <LayoutTemplate className="h-4 w-4" />
          Templates
        </Link>
      </div>

      {/* Three creation mode cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          href="/cover-letters/new?source=scratch"
          className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left transition hover:border-[var(--color-primary-300)] hover:bg-[var(--color-surface-2)]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400">
            <PenLine className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-[var(--color-text-primary)]">From Scratch</p>
            <p className="mt-0.5 text-xs text-[var(--color-muted)]">
              Write a new letter using your CV profile.
            </p>
          </div>
        </Link>

        <Link
          href="/cover-letters/new/existing"
          className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left transition hover:border-[var(--color-primary-300)] hover:bg-[var(--color-surface-2)]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
            <Copy className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-[var(--color-text-primary)]">From Existing</p>
            <p className="mt-0.5 text-xs text-[var(--color-muted)]">
              Enhance and rewrite an existing letter.
            </p>
          </div>
        </Link>

        <Link
          href="/cover-letters/new?source=job_description"
          className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left transition hover:border-[var(--color-primary-300)] hover:bg-[var(--color-surface-2)]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
            <FileSearch className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-[var(--color-text-primary)]">From Job Description</p>
            <p className="mt-0.5 text-xs text-[var(--color-muted)]">
              Paste a JD and generate a tailored letter.
            </p>
          </div>
        </Link>
      </div>

      {/* List */}
      {isLoading ? <p className="text-sm text-[var(--color-muted)]">Loading…</p> : null}

      {!isLoading && letters.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] py-12 text-center">
          <p className="text-3xl">✉️</p>
          <p className="mt-3 font-medium text-[var(--color-text-primary)]">No cover letters yet</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Choose a creation mode above to get started.
          </p>
        </div>
      ) : null}

      <ul className="space-y-3">
        {visible.map((l) => (
          <motion.li
            key={l.id}
            layout
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition hover:border-[var(--color-border-hover)] hover:bg-[var(--color-surface-2)]"
          >
            <Link href={`/cover-letters/${l.id}`} className="min-w-0 flex-1">
              <div className="font-medium">{l.name || 'Cover letter'}</div>
              <div className="text-sm text-[var(--color-muted)]">
                {l.applicant_role || '—'}
              </div>
              <div className="mt-1 text-xs text-[var(--color-muted)]">{formatDate(l.created_at)}</div>
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              {l.ats_score != null ? <ATSBadge score={l.ats_score} /> : null}
              {l.source_type ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    SOURCE_COLOR[l.source_type] ?? 'bg-[var(--color-surface-2)] text-[var(--color-muted)]'
                  }`}
                >
                  {SOURCE_LABEL[l.source_type] ?? l.source_type}
                </span>
              ) : null}
              {l.tone ? <Badge variant="default">{l.tone}</Badge> : null}
              <button
                type="button"
                className="text-lg text-amber-500"
                onClick={() =>
                  fav.mutate({ id: l.id, is_favourited: !l.is_favourited })
                }
              >
                <Star className={`h-4 w-4 ${l.is_favourited ? 'fill-current' : ''}`} />
              </button>
              {confirmDeleteId === l.id ? (
                <div className="flex items-center gap-2 text-xs">
                  <span>Are you sure?</span>
                  <button type="button" className="text-red-600" onClick={() => del.mutate(l.id)}>
                    Yes, delete
                  </button>
                  <button type="button" onClick={() => setConfirmDeleteId(null)}>
                    Cancel
                  </button>
                </div>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(l.id)}>
                  Delete
                </Button>
              )}
            </div>
          </motion.li>
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
