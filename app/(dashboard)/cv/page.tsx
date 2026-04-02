'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { LayoutTemplate, Upload, Wand2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { useCoreCVVersions, useDeleteCoreCVVersion } from '@/hooks/useCV';
import { useArchiveJobSpecificCV, useJobSpecificCVs } from '@/hooks/useJobSpecificCVs';
import type { JobSpecificCV } from '@/types';

const btn =
  'inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition';
const primary = `${btn} bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]`;
const secondary = `${btn} border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-slate-50`;

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

function CoreCVRow({
  cv,
  onDelete,
}: {
  cv: {
    id: string;
    full_name: string | null;
    completion_percentage: number;
    created_at: string;
  };
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <div className="min-w-0">
        <div className="truncate font-semibold text-[var(--color-secondary)]">
          {cv.full_name ?? 'Untitled CV'}
        </div>
        <div className="text-xs text-[var(--color-muted)]">
          Completed {cv.completion_percentage}% &middot; {relativeTime(cv.created_at)}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link href={`/cv/edit?core_cv_id=${encodeURIComponent(cv.id)}`}>
          <Button variant="ghost" size="sm">
            Edit
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          className="text-red-600 hover:bg-red-50"
          onClick={() => onDelete(cv.id)}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

function JobCVRow({
  cv,
  onDelete,
}: {
  cv: JobSpecificCV;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition hover:shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="truncate font-semibold text-[var(--color-secondary)]">
            {cv.company_name || `Role: ${cv.job_title}`}
          </h3>
          <p className="truncate text-sm text-[var(--color-muted)]">{cv.job_title}</p>
          <p className="text-xs text-[var(--color-muted)]">Saved {relativeTime(cv.created_at)}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href={`/cv/job-specific/${cv.id}/edit`}>
            <Button variant="ghost" size="sm">
              Edit
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:bg-red-50"
            onClick={() => onDelete(cv.id)}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function CVOverviewPage() {
  const { toast } = useToast();
  const [confirmDeleteCoreId, setConfirmDeleteCoreId] = useState<string | null>(null);
  const [confirmDeleteJobId, setConfirmDeleteJobId] = useState<string | null>(null);
  const {
    data: coreVersions = [],
    isLoading: coreVersionsLoading,
  } = useCoreCVVersions();
  const deleteCore = useDeleteCoreCVVersion();

  const { data: jobCVs, isLoading: jobLoading } = useJobSpecificCVs();
  const archiveJob = useArchiveJobSpecificCV();

  const [jobSearch, setJobSearch] = useState('');
  const [jobSort, setJobSort] = useState<'newest' | 'oldest'>('newest');

  const filteredJobCVs = useMemo(() => {
    if (!jobCVs) return [];
    let list = [...jobCVs];
    if (jobSearch.trim()) {
      const q = jobSearch.toLowerCase();
      list = list.filter(
        (cv) =>
          (cv.company_name ?? '').toLowerCase().includes(q) ||
          cv.job_title.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      const d = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return jobSort === 'newest' ? -d : d;
    });
    return list;
  }, [jobCVs, jobSearch, jobSort]);

  const handleDeleteCore = async (id: string) => {
    try {
      await deleteCore.mutateAsync(id);
      toast('Core CV version deleted.', 'success');
    } catch {
      toast('Failed to delete core CV.', 'error');
    }
  };

  const handleDeleteJob = async (id: string) => {
    try {
      await archiveJob.mutateAsync(id);
      toast('Job CV deleted.', 'success');
    } catch {
      toast('Failed to delete job CV.', 'error');
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">CV</h1>
          <p className="text-sm text-[var(--color-muted)]">
            Manage your core CV and role-specific versions in one place.
          </p>
        </div>
        <Link href="/cv/templates" className={`${secondary} px-3 py-2 text-sm`}>
          <LayoutTemplate className="mr-2 h-4 w-4" />
          Templates
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4" hoverable>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700"><Upload className="h-5 w-5" /></span>
          <h2 className="font-semibold">Upload</h2>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            PDF or DOCX up to 10MB. We extract structure with AI.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/cv/upload" className={primary}>
              Upload CV
            </Link>
          </div>
        </Card>

        <Card className="p-4" hoverable>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-700"><LayoutTemplate className="h-5 w-5" /></span>
          <h2 className="font-semibold">Build from Scratch</h2>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Start with a fresh template and fill in your details manually.
          </p>
          <div className="mt-4">
            <Link href="/cv/edit?new=1" className={primary}>
              Build CV
            </Link>
          </div>
        </Card>

        <Card className="p-4" hoverable>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Wand2 className="h-5 w-5" /></span>
          <h2 className="font-semibold">Tailor for a Job</h2>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Paste a job description and AI will optimise your CV for that role.
          </p>
          <div className="mt-4">
            <Link href="/cv/optimise" className={primary}>
              Tailor My CV
            </Link>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="font-semibold">Core CV Versions</h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Your master CV versions. Edit or delete any version.
          </p>

          <div className="mt-4 space-y-3">
            {coreVersionsLoading && (
              <>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-20 animate-pulse rounded-xl border border-[var(--color-border)] bg-slate-50"
                  />
                ))}
              </>
            )}

            {!coreVersionsLoading && coreVersions.length === 0 && (
              <p className="py-10 text-center text-sm text-[var(--color-muted)]">
                No core CV versions yet. Upload your first CV.
              </p>
            )}

            {!coreVersionsLoading &&
              coreVersions.map((cv) => (
                <motion.div key={cv.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <CoreCVRow
                    cv={cv}
                    onDelete={(id) => {
                      if (confirmDeleteCoreId === id) {
                        setConfirmDeleteCoreId(null);
                        void handleDeleteCore(id);
                        return;
                      }
                      setConfirmDeleteCoreId(id);
                    }}
                  />
                  {confirmDeleteCoreId === cv.id ? (
                    <div className="mt-1 text-xs text-red-600">Click delete again to confirm.</div>
                  ) : null}
                </motion.div>
              ))}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">Job Specific CVs</h2>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                Tailored versions saved for specific roles. Edit or delete any CV.
              </p>
            </div>
            <Link href="/cv/optimise" className={`${primary} !px-4 !py-2.5 text-sm`}>
              Tailor New CV
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Input
              placeholder="Search by company or job title..."
              value={jobSearch}
              onChange={(e) => setJobSearch(e.target.value)}
              className="max-w-xs"
            />
            <button
              type="button"
              className="text-xs font-medium text-[var(--color-muted)] hover:text-[var(--color-secondary)]"
              onClick={() => setJobSort(jobSort === 'newest' ? 'oldest' : 'newest')}
            >
              {jobSort === 'newest' ? 'Newest first ↓' : 'Oldest first ↑'}
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {jobLoading && (
              <>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-24 animate-pulse rounded-xl border border-[var(--color-border)] bg-slate-50"
                  />
                ))}
              </>
            )}

            {!jobLoading && (!jobCVs || jobCVs.length === 0) && (
              <p className="py-10 text-center text-sm text-[var(--color-muted)]">
                No job-specific CVs yet. Tailor your CV for a specific role to create one.
              </p>
            )}

            {!jobLoading && jobCVs && jobCVs.length > 0 && (
              <>
                {filteredJobCVs.length > 0 ? (
                  filteredJobCVs.map((cv) => (
                    <JobCVRow
                      key={cv.id}
                      cv={cv}
                      onDelete={(id) => {
                        if (confirmDeleteJobId === id) {
                          setConfirmDeleteJobId(null);
                          void handleDeleteJob(id);
                          return;
                        }
                        setConfirmDeleteJobId(id);
                      }}
                    />
                  ))
                ) : (
                  <p className="py-8 text-center text-sm text-[var(--color-muted)]">
                    No matches found.
                  </p>
                )}
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
