'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  FilePlus2,
  Target,
  Edit,
  Trash2,
  FileText,
  Upload,
  LayoutTemplate,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { PrimaryActionBar } from '@/components/shared/PrimaryActionBar';
import { useToast } from '@/components/ui/toast';
import { useAuthStore } from '@/stores/useAuthStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { CVProfile } from '@/types';
import { relativeTime } from '@/components/cv/dashboard/cv-dashboard-utils';

type FilterTab = 'all' | 'general' | 'job-specific';

function useAllCVs() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['all-cvs', userId],
    enabled: !!userId,
    queryFn: async (): Promise<CVProfile[]> => {
      const res = await fetch('/api/cvs');
      if (!res.ok) throw new Error('Failed to load CVs');
      return res.json() as Promise<CVProfile[]>;
    },
    staleTime: 30_000,
  });
}

function CVCard({
  cv,
  onDelete,
  deleting,
}: {
  cv: CVProfile;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isJobSpecific = (cv.job_ids?.length ?? 0) > 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition hover:border-[var(--color-border-hover)] hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-[var(--color-text-primary)]">
            {cv.name || 'Untitled CV'}
          </p>
          {isJobSpecific ? (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-100)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-primary-700)]">
              <Target className="h-2.5 w-2.5" /> Job-specific
            </span>
          ) : (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-2)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-muted)]">
              <FileText className="h-2.5 w-2.5" /> General
            </span>
          )}
        </div>
        <FileText className="h-5 w-5 shrink-0 text-[var(--color-muted)]" />
      </div>

      <div className="space-y-0.5 text-xs text-[var(--color-muted)]">
        <div className="flex items-center gap-2">
          <div
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-2)]"
            role="progressbar"
            aria-valuenow={cv.completion_percentage}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-[var(--color-primary)]"
              style={{ width: `${cv.completion_percentage}%` }}
            />
          </div>
          <span>{cv.completion_percentage}%</span>
        </div>
        <p>Template: {cv.preferred_template_id || 'classic'}</p>
        <p>Updated {relativeTime(cv.updated_at)}</p>
      </div>

      <div className="flex items-center gap-2">
        <Link href={`/cv/edit/${cv.id}`} className="flex-1">
          <Button variant="primary" size="sm" className="w-full gap-1.5">
            <Edit className="h-3.5 w-3.5" /> Edit
          </Button>
        </Link>
        {confirmDelete ? (
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-red-600 hover:underline"
              onClick={() => onDelete(cv.id)}
              loading={deleting}
              disabled={deleting}
            >
              Confirm
            </Button>
            <button
              type="button"
              className="text-xs text-[var(--color-muted)] hover:underline"
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
            >
              Cancel
            </button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmDelete(true)}
            aria-label="Delete CV"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}

export default function CVLibraryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { data: cvs = [], isLoading } = useAllCVs();

  const filtered = cvs.filter((cv) => {
    if (filter === 'general') return (cv.job_ids?.length ?? 0) === 0;
    if (filter === 'job-specific') return (cv.job_ids?.length ?? 0) > 0;
    return true;
  });

  async function handleCreateCV() {
    setCreating(true);
    try {
      const res = await fetch('/api/cvs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Untitled CV' }),
      });
      if (!res.ok) throw new Error('Failed to create CV');
      const cv = (await res.json()) as { id: string };
      void qc.invalidateQueries({ queryKey: ['all-cvs'] });
      void qc.invalidateQueries({ queryKey: ['cv-versions'] });
      router.push(`/cv/edit/${cv.id}`);
    } catch {
      toast('Failed to create CV. Please try again.', 'error');
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    qc.setQueryData(['all-cvs', userId], (old: CVProfile[] | undefined) =>
      old?.filter((cv) => cv.id !== id) ?? []
    );
    try {
      const res = await fetch(`/api/cvs/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast('CV deleted.', 'success');
      void qc.invalidateQueries({ queryKey: ['cv-versions'] });
    } catch {
      void qc.invalidateQueries({ queryKey: ['all-cvs'] });
      toast('Failed to delete CV.', 'error');
    } finally {
      setDeletingId(null);
    }
  }

  const TABS: { key: FilterTab; label: string }[] = [
    { key: 'all', label: `All (${cvs.length})` },
    { key: 'general', label: `General (${cvs.filter((c) => (c.job_ids?.length ?? 0) === 0).length})` },
    { key: 'job-specific', label: `Job-specific (${cvs.filter((c) => (c.job_ids?.length ?? 0) > 0).length})` },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="CV Library"
        subtitle="Create, manage, and tailor your CVs."
        actions={
          <PrimaryActionBar>
            <Link href="/cv/upload">
              <Button variant="secondary" size="sm" className="gap-1.5">
                <Upload className="h-4 w-4" /> Upload CV
              </Button>
            </Link>
            <Link href="/cv/templates">
              <Button variant="secondary" size="sm" className="gap-1.5">
                <LayoutTemplate className="h-4 w-4" /> Templates
              </Button>
            </Link>
          </PrimaryActionBar>
        }
      />

      {/* Primary creation CTAs */}
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => void handleCreateCV()}
          disabled={creating}
          className="flex items-start gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left transition hover:border-[var(--color-primary-300)] hover:bg-[var(--color-surface-2)] disabled:opacity-50"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary-100)] text-[var(--color-primary)]">
            {creating ? (
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <FilePlus2 className="h-5 w-5" />
            )}
          </div>
          <div>
            <p className="font-semibold text-[var(--color-text-primary)]">{creating ? 'Creating…' : 'Create CV'}</p>
            <p className="mt-0.5 text-sm text-[var(--color-muted)]">
              Start from scratch or build your general CV.
            </p>
          </div>
        </button>

        <Link href="/cv/create-for-job" className="block">
          <div className="flex items-start gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left transition hover:border-[var(--color-primary-300)] hover:bg-[var(--color-surface-2)]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-[var(--color-text-primary)]">Create CV For Job</p>
              <p className="mt-0.5 text-sm text-[var(--color-muted)]">
                AI-optimized CV tailored to a specific job description.
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-faint)] p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
              filter === tab.key
                ? 'bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-sm'
                : 'text-[var(--color-muted)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* CV grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-[var(--color-surface-2)]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] py-16 text-center">
          <FileText className="mx-auto h-10 w-10 text-[var(--color-muted)]" />
          <p className="mt-3 font-medium text-[var(--color-text-primary)]">
            {filter === 'all' ? 'No CVs yet' : `No ${filter} CVs`}
          </p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {filter === 'all'
              ? 'Create your first CV to get started.'
              : filter === 'general'
              ? 'Create a general CV to reuse across applications.'
              : 'Generate a job-specific CV from the options above.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((cv) => (
            <CVCard key={cv.id} cv={cv} onDelete={handleDelete} deleting={deletingId === cv.id} />
          ))}
        </div>
      )}
    </div>
  );
}
