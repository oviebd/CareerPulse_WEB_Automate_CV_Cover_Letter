'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CVEditor } from '@/components/cv/CVEditor';
import { JobTailoredCVEditor } from '@/components/cv/JobTailoredCVEditor';

function UnifiedCVEditorInner({ forceTailored }: { forceTailored?: boolean }) {
  const searchParams = useSearchParams();
  const tailored =
    forceTailored ||
    searchParams.get('tailored') === 'true' ||
    searchParams.has('job');

  if (tailored) {
    return <JobTailoredCVEditor />;
  }
  return <CVEditor />;
}

/**
 * Single CV editor entry point. Base CV hides ATS job panel; tailored mode shows
 * ATS drawer, keywords, and job context (formerly /cv/job-specific/[id]/edit).
 */
export function UnifiedCVEditor({ forceTailored }: { forceTailored?: boolean }) {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--color-muted)]">Loading editor…</p>}>
      <UnifiedCVEditorInner forceTailored={forceTailored} />
    </Suspense>
  );
}
