'use client';

/**
 * CV dashboard (/cv) — UX refactor (layout & hierarchy only; behavior preserved):
 * - Before: 50/50 columns and equally heavy action cards → weak scan path and wasted center space.
 * - Before: Core rows lacked completion affordance; primary “tailor” action had no emphasis.
 * Now: ~65/35 split, compact action row with highlighted Tailor, progress + recency on core rows,
 * clearer job cards and improved empty states. Data, routes, and delete-confirm flow unchanged.
 */

import { useMemo, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { useCoreCVVersions, useDeleteCoreCVVersion } from '@/hooks/useCV';
import { useArchiveJobSpecificCV, useJobSpecificCVs } from '@/hooks/useJobSpecificCVs';
import { CVHeader } from '@/components/cv/dashboard/CVHeader';
import { CVActionCards } from '@/components/cv/dashboard/CVActionCards';
import { CoreCVSection } from '@/components/cv/dashboard/CoreCVSection';
import { JobCVSection } from '@/components/cv/dashboard/JobCVSection';

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
    <div className="relative mx-auto max-w-6xl">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-4 -inset-y-2 -z-10 rounded-[1.5rem] bg-[radial-gradient(ellipse_90%_50%_at_50%_-30%,var(--color-primary-500)/10,transparent_55%),radial-gradient(ellipse_70%_45%_at_100%_0%,var(--color-accent-mint)/8,transparent_50%),radial-gradient(ellipse_60%_40%_at_0%_100%,var(--color-primary-500)/6,transparent_55%)] sm:-inset-x-6"
      />

      <CVHeader />
      <CVActionCards />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] lg:items-start lg:gap-8">
        <CoreCVSection
          versions={coreVersions}
          loading={coreVersionsLoading}
          confirmDeleteId={confirmDeleteCoreId}
          onRequestDelete={(id) => {
            if (confirmDeleteCoreId === id) {
              setConfirmDeleteCoreId(null);
              void handleDeleteCore(id);
              return;
            }
            setConfirmDeleteCoreId(id);
          }}
        />
        <JobCVSection
          jobSearch={jobSearch}
          onJobSearchChange={setJobSearch}
          jobSort={jobSort}
          onToggleSort={() => setJobSort(jobSort === 'newest' ? 'oldest' : 'newest')}
          filteredJobCVs={filteredJobCVs}
          jobCVs={jobCVs}
          jobLoading={jobLoading}
          confirmDeleteId={confirmDeleteJobId}
          onRequestDelete={(id) => {
            if (confirmDeleteJobId === id) {
              setConfirmDeleteJobId(null);
              void handleDeleteJob(id);
              return;
            }
            setConfirmDeleteJobId(id);
          }}
        />
      </div>
    </div>
  );
}
