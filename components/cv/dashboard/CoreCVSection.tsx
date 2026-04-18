'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import type { CoreCVVersion } from '@/hooks/useCV';
import { CoreCVCard } from './CVCard';
import { cvDashboardPrimary, cvDashboardSecondary } from './cv-dashboard-utils';

type Props = {
  versions: CoreCVVersion[];
  loading: boolean;
  confirmDeleteId: string | null;
  onRequestDelete: (id: string) => void;
};

/**
 * Primary column (~62% on large screens): master CV versions with completion and recency.
 */
export function CoreCVSection({
  versions,
  loading,
  confirmDeleteId,
  onRequestDelete,
}: Props) {
  const sorted = useMemo(
    () =>
      [...versions].sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at).getTime() -
          new Date(a.updated_at || a.created_at).getTime()
      ),
    [versions]
  );

  return (
    <Card className="h-full rounded-2xl border-[var(--color-border)]/90 p-5 shadow-sm" padding="none">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-border)]/80 px-5 pb-4 pt-1">
        <div className="min-w-0 space-y-1">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
            Core CV Versions
          </h2>
          <p className="text-sm text-[var(--color-muted)]">
            Your master CV versions. Edit or delete any version.
          </p>
        </div>
        <Link
          href="/cv/edit?new=1"
          className={`${cvDashboardSecondary} shrink-0 px-3 py-2 text-xs font-semibold sm:text-sm`}
        >
          Create New Version
        </Link>
      </div>

      <div className="space-y-3 px-5 py-5">
        {loading && (
          <>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[5.5rem] animate-pulse rounded-2xl border border-[var(--color-border)]/80 bg-[var(--color-control-bg)]/50"
              />
            ))}
          </>
        )}

        {!loading && sorted.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-control-bg)]/20 px-6 py-10 text-center">
            <p className="text-sm text-[var(--color-muted)]">
              No core CV versions yet. Upload your first CV or build one from scratch.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <Link href="/cv/upload" className={`${cvDashboardPrimary} px-5`}>
                Upload CV
              </Link>
              <Link href="/cv/edit?new=1" className={`${cvDashboardSecondary} px-5`}>
                Build CV
              </Link>
            </div>
          </div>
        )}

        {!loading &&
          sorted.map((cv) => (
            <motion.div
              key={cv.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CoreCVCard
                cv={cv}
                onDelete={() => onRequestDelete(cv.id)}
              />
              {confirmDeleteId === cv.id ? (
                <p className="mt-1.5 pl-1 text-xs text-red-600 dark:text-red-400">
                  Click delete again to confirm.
                </p>
              ) : null}
            </motion.div>
          ))}
      </div>
    </Card>
  );
}
