'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { useJobSpecificCVs, useArchiveJobSpecificCV } from '@/hooks/useJobSpecificCVs';
import type { JobSpecificCV } from '@/types';

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function JobCVCard({
  cv,
  onArchive,
}: {
  cv: JobSpecificCV;
  onArchive: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const keywords = cv.keywords_added ?? [];
  const showKeywords = keywords.slice(0, 4);
  const extraCount = keywords.length - showKeywords.length;

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition hover:shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="truncate font-semibold text-[var(--color-secondary)]">
            {cv.company_name || `Role: ${cv.job_title}`}
          </h3>
          <p className="truncate text-sm text-[var(--color-muted)]">
            {cv.job_title}
          </p>
          <p className="text-xs text-[var(--color-muted)]">
            Saved {relativeTime(cv.created_at)}
          </p>
          {showKeywords.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {showKeywords.map((kw) => (
                <span
                  key={kw}
                  className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600"
                >
                  {kw}
                </span>
              ))}
              {extraCount > 0 && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                  + {extraCount} more
                </span>
              )}
            </div>
          )}
          <p className="text-xs text-[var(--color-muted)]">
            {keywords.length} keyword{keywords.length !== 1 ? 's' : ''} &middot;{' '}
            {cv.bullets_improved} bullet{cv.bullets_improved !== 1 ? 's' : ''} improved
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link href={`/cv/job-specific/${cv.id}/edit`}>
            <Button variant="ghost" size="sm">Edit</Button>
          </Link>
          <Link
            href={`/cv/templates?job_cv_id=${cv.id}`}
          >
            <Button variant="ghost" size="sm">Export</Button>
          </Link>
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="More actions"
            >
              &hellip;
            </Button>
            {menuOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-20"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                />
                <div className="absolute right-0 top-full z-30 mt-1 w-40 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-lg">
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                    onClick={() => {
                      setMenuOpen(false);
                      onArchive(cv.id);
                    }}
                  >
                    Archive
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function JobSpecificCVsPage() {
  const { data: jobCVs, isLoading } = useJobSpecificCVs();
  const archive = useArchiveJobSpecificCV();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');

  const filtered = useMemo(() => {
    if (!jobCVs) return [];
    let list = [...jobCVs];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (cv) =>
          (cv.company_name ?? '').toLowerCase().includes(q) ||
          cv.job_title.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      const d = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sort === 'newest' ? -d : d;
    });
    return list;
  }, [jobCVs, search, sort]);

  const handleArchive = async (id: string) => {
    try {
      await archive.mutateAsync(id);
      toast('CV archived', 'success');
    } catch {
      toast('Failed to archive', 'error');
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Job Specific CVs</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Tailored versions of your CV saved for specific roles
          </p>
        </div>
        <Link href="/cv/optimise">
          <Button variant="primary" size="sm">
            Tailor New CV &rarr;
          </Button>
        </Link>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl border border-[var(--color-border)] bg-slate-50"
            />
          ))}
        </div>
      )}

      {!isLoading && (!jobCVs || jobCVs.length === 0) && (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--color-border)] py-16 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
            <svg className="h-7 w-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </div>
          <h3 className="font-display text-lg font-semibold">No job-specific CVs yet</h3>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Tailor your CV for a specific role and save it here for future use.
          </p>
          <Link href="/cv/optimise" className="mt-4">
            <Button variant="primary">Tailor My First CV &rarr;</Button>
          </Link>
        </div>
      )}

      {!isLoading && jobCVs && jobCVs.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="Search by company or job title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <button
              type="button"
              className="text-xs font-medium text-[var(--color-muted)] hover:text-[var(--color-secondary)]"
              onClick={() => setSort(sort === 'newest' ? 'oldest' : 'newest')}
            >
              {sort === 'newest' ? 'Newest first ↓' : 'Oldest first ↑'}
            </button>
          </div>
          <div className="space-y-3">
            {filtered.map((cv) => (
              <JobCVCard
                key={cv.id}
                cv={cv}
                onArchive={(id) => void handleArchive(id)}
              />
            ))}
            {filtered.length === 0 && (
              <p className="py-8 text-center text-sm text-[var(--color-muted)]">
                No matches found.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
