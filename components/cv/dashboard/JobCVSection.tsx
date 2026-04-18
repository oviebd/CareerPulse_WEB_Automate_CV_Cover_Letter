'use client';

import Link from 'next/link';
import { Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { JobSpecificCV } from '@/types';
import { JobCVCard } from './CVCard';
import { cvDashboardPrimary } from './cv-dashboard-utils';

type Props = {
  jobSearch: string;
  onJobSearchChange: (v: string) => void;
  jobSort: 'newest' | 'oldest';
  onToggleSort: () => void;
  filteredJobCVs: JobSpecificCV[];
  jobCVs: JobSpecificCV[] | undefined;
  jobLoading: boolean;
  confirmDeleteId: string | null;
  onRequestDelete: (id: string) => void;
};

/**
 * Secondary column: tailored CVs with search and sort (newest first default — unchanged logic).
 */
export function JobCVSection({
  jobSearch,
  onJobSearchChange,
  jobSort,
  onToggleSort,
  filteredJobCVs,
  jobCVs,
  jobLoading,
  confirmDeleteId,
  onRequestDelete,
}: Props) {
  return (
    <Card className="h-full rounded-2xl border-[var(--color-border)]/90 p-5 shadow-sm" padding="none">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-border)]/80 px-5 pb-4 pt-1">
        <div className="min-w-0 space-y-1">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
            Job Specific CVs
          </h2>
          <p className="text-sm text-[var(--color-muted)]">
            Tailored versions saved for specific roles. Edit or delete any CV.
          </p>
        </div>
        <Link
          href="/cv/optimise"
          className={`${cvDashboardPrimary} shrink-0 px-4 py-2.5 text-xs font-semibold sm:text-sm`}
        >
          Tailor New CV
        </Link>
      </div>

      <div className="space-y-3 border-b border-[var(--color-border)]/60 px-5 py-4">
        <Input
          placeholder="Search by company or job title..."
          value={jobSearch}
          onChange={(e) => onJobSearchChange(e.target.value)}
          leftIcon={<Search className="h-4 w-4" aria-hidden />}
          className="rounded-xl border-[var(--color-border)]/90 bg-[var(--color-input-bg)] shadow-none"
        />
        <div className="flex justify-end">
          <button
            type="button"
            className="text-xs font-medium text-[var(--color-muted)] underline-offset-2 transition hover:text-[var(--color-text-primary)] hover:underline"
            onClick={onToggleSort}
          >
            {jobSort === 'newest' ? 'Newest first ↓' : 'Oldest first ↑'}
          </button>
        </div>
      </div>

      <div className="space-y-3 px-5 py-5">
        {jobLoading && (
          <>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl border border-[var(--color-border)]/80 bg-[var(--color-control-bg)]/50"
              />
            ))}
          </>
        )}

        {!jobLoading && (!jobCVs || jobCVs.length === 0) && (
          <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-control-bg)]/20 px-6 py-10 text-center">
            <p className="text-sm text-[var(--color-muted)]">
              No job-specific CVs yet. Tailor your CV for a specific role to create one.
            </p>
            <Link href="/cv/optimise" className={`${cvDashboardPrimary} mt-5 inline-flex`}>
              Tailor My CV
            </Link>
          </div>
        )}

        {!jobLoading && jobCVs && jobCVs.length > 0 && (
          <>
            {filteredJobCVs.length > 0 ? (
              filteredJobCVs.map((cv) => (
                <motion.div
                  key={cv.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <JobCVCard
                    cv={cv}
                    onDelete={() => onRequestDelete(cv.id)}
                  />
                  {confirmDeleteId === cv.id ? (
                    <p className="mt-1.5 pl-1 text-xs text-red-600 dark:text-red-400">
                      Click delete again to confirm.
                    </p>
                  ) : null}
                </motion.div>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-[var(--color-muted)]">No matches found.</p>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
