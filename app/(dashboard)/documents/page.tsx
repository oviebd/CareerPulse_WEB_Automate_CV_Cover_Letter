'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Edit,
  FilePlus2,
  FileSearch,
  FileText,
  LayoutTemplate,
  Mail,
  PenLine,
  Star,
  Target,
  Trash2,
  Upload,
  Copy,
} from 'lucide-react';
import { ATSBadge } from '@/components/shared/ATSBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { PrimaryActionBar } from '@/components/shared/PrimaryActionBar';
import { UpgradeCTA } from '@/components/shared/UpgradeCTA';
import { useToast } from '@/components/ui/toast';
import { useAuthStore } from '@/stores/useAuthStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useCoverLettersList,
  useDeleteCoverLetter,
  useToggleCoverLetterFavourite,
} from '@/hooks/useCoverLetters';
import { useSubscription } from '@/hooks/useSubscription';
import { formatDate } from '@/lib/utils';
import { relativeTime } from '@/components/cv/dashboard/cv-dashboard-utils';
import type { CVProfile } from '@/types';

// ─── Resumes tab ─────────────────────────────────────────────────────────────

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

type CvFilterTab = 'all' | 'general' | 'job-specific';

function CVCard({ cv, onDelete }: { cv: CVProfile; onDelete: (id: string) => void }) {
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
            <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => onDelete(cv.id)}>
              Confirm
            </button>
            <button type="button" className="text-xs text-[var(--color-muted)] hover:underline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)} aria-label="Delete CV">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}

function ResumesTab() {
  const router = useRouter();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<CvFilterTab>('all');
  const [creating, setCreating] = useState(false);
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
    try {
      const res = await fetch(`/api/cvs/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast('CV deleted.', 'success');
      void qc.invalidateQueries({ queryKey: ['all-cvs'] });
      void qc.invalidateQueries({ queryKey: ['cv-versions'] });
    } catch {
      toast('Failed to delete CV.', 'error');
    }
  }

  const TABS: { key: CvFilterTab; label: string }[] = [
    { key: 'all', label: `All (${cvs.length})` },
    { key: 'general', label: `General (${cvs.filter((c) => (c.job_ids?.length ?? 0) === 0).length})` },
    { key: 'job-specific', label: `Job-specific (${cvs.filter((c) => (c.job_ids?.length ?? 0) > 0).length})` },
  ];

  return (
    <div className="space-y-6">
      {/* Creation CTAs */}
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => void handleCreateCV()}
          disabled={creating}
          className="flex items-start gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left transition hover:border-[var(--color-primary-300)] hover:bg-[var(--color-surface-2)] disabled:opacity-50"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary-100)] text-[var(--color-primary)]">
            <FilePlus2 className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-[var(--color-text-primary)]">Create Resume</p>
            <p className="mt-0.5 text-sm text-[var(--color-muted)]">Start from scratch or build your general resume.</p>
          </div>
        </button>

        <Link href="/applications/new" className="block">
          <div className="flex items-start gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left transition hover:border-[var(--color-primary-300)] hover:bg-[var(--color-surface-2)]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-[var(--color-text-primary)]">Generate for a Job</p>
              <p className="mt-0.5 text-sm text-[var(--color-muted)]">AI-tailored resume + optional cover letter for a specific role.</p>
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
            {filter === 'all' ? 'No resumes yet' : `No ${filter} resumes`}
          </p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {filter === 'all'
              ? 'Create your first resume to get started.'
              : filter === 'general'
              ? 'Create a general resume to reuse across applications.'
              : 'Generate a job-specific resume from the options above.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((cv) => (
            <CVCard key={cv.id} cv={cv} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Cover Letters tab ────────────────────────────────────────────────────────

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

function CoverLettersTab() {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const { tier } = useSubscription();
  const { data: letters = [], isLoading } = useCoverLettersList();
  const del = useDeleteCoverLetter();
  const fav = useToggleCoverLetterFavourite();
  const isFree = tier === 'free';
  const visible = isFree ? letters.slice(0, 5) : letters;

  return (
    <div className="space-y-6">
      {/* Creation CTAs */}
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
            <p className="mt-0.5 text-xs text-[var(--color-muted)]">Write a new letter using your resume profile.</p>
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
            <p className="font-semibold text-[var(--color-text-primary)]">Enhance Existing</p>
            <p className="mt-0.5 text-xs text-[var(--color-muted)]">AI rewrites an existing letter for clarity and impact.</p>
          </div>
        </Link>

        <Link
          href="/applications/new"
          className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left transition hover:border-[var(--color-primary-300)] hover:bg-[var(--color-surface-2)]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
            <FileSearch className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-[var(--color-text-primary)]">From Job Description</p>
            <p className="mt-0.5 text-xs text-[var(--color-muted)]">Paste a JD and generate a tailored letter.</p>
          </div>
        </Link>
      </div>

      {/* List */}
      {isLoading ? <p className="text-sm text-[var(--color-muted)]">Loading…</p> : null}

      {!isLoading && letters.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] py-12 text-center">
          <Mail className="mx-auto h-10 w-10 text-[var(--color-muted)]" />
          <p className="mt-3 font-medium text-[var(--color-text-primary)]">No cover letters yet</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Choose a creation mode above to get started.</p>
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
              <div className="text-sm text-[var(--color-muted)]">{l.applicant_role || '—'}</div>
              <div className="mt-1 text-xs text-[var(--color-muted)]">{formatDate(l.created_at)}</div>
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              {l.ats_score != null ? <ATSBadge score={l.ats_score} /> : null}
              {l.source_type ? (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${SOURCE_COLOR[l.source_type] ?? 'bg-[var(--color-surface-2)] text-[var(--color-muted)]'}`}>
                  {SOURCE_LABEL[l.source_type] ?? l.source_type}
                </span>
              ) : null}
              {l.tone ? <Badge variant="default">{l.tone}</Badge> : null}
              <button type="button" className="text-lg text-amber-500" onClick={() => fav.mutate({ id: l.id, is_favourited: !l.is_favourited })}>
                <Star className={`h-4 w-4 ${l.is_favourited ? 'fill-current' : ''}`} />
              </button>
              {confirmDeleteId === l.id ? (
                <div className="flex items-center gap-2 text-xs">
                  <span>Are you sure?</span>
                  <button type="button" className="text-red-600" onClick={() => del.mutate(l.id)}>Yes, delete</button>
                  <button type="button" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                </div>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(l.id)}>Delete</Button>
              )}
            </div>
          </motion.li>
        ))}
      </ul>

      {isFree && letters.length > 5 ? (
        <div className="relative rounded-xl border border-dashed border-[var(--color-border)] p-8 text-center">
          <p className="text-sm text-[var(--color-muted)] blur-sm">Older letters hidden on Free plan.</p>
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <UpgradeCTA />
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type DocumentTab = 'resumes' | 'cover-letters';

export default function DocumentsPage() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as DocumentTab) ?? 'resumes';
  const [activeTab, setActiveTab] = useState<DocumentTab>(initialTab);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Documents"
        subtitle="Your resumes and cover letters."
        actions={
          <PrimaryActionBar>
            <Link href="/cv/upload">
              <Button variant="secondary" size="sm" className="gap-1.5">
                <Upload className="h-4 w-4" /> Upload Resume
              </Button>
            </Link>
            <Link href={activeTab === 'resumes' ? '/cv/templates' : '/cover-letters/templates'}>
              <Button variant="secondary" size="sm" className="gap-1.5">
                <LayoutTemplate className="h-4 w-4" /> Templates
              </Button>
            </Link>
          </PrimaryActionBar>
        }
      />

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-faint)] p-1 w-fit">
        {([['resumes', 'Resumes', FileText], ['cover-letters', 'Cover Letters', Mail]] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
              activeTab === key
                ? 'bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-sm'
                : 'text-[var(--color-muted)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'resumes' ? <ResumesTab /> : <CoverLettersTab />}
    </div>
  );
}
