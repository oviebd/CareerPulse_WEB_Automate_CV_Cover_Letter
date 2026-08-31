'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CVEditor } from '@/components/cv/CVEditor';
import { JobTailoredCVEditor } from '@/components/cv/JobTailoredCVEditor';

export type CVEditorMode = 'core' | 'tailored' | 'template-focused';

function resolveMode(
  searchParams: URLSearchParams,
  forceTailored?: boolean
): CVEditorMode {
  if (
    forceTailored ||
    searchParams.get('tailored') === 'true' ||
    searchParams.has('job')
  ) {
    return 'tailored';
  }
  return 'core';
}

function UnifiedCVEditorInner({
  forceTailored,
  mode: modeOverride,
}: {
  forceTailored?: boolean;
  mode?: CVEditorMode;
}) {
  const searchParams = useSearchParams();
  const mode = modeOverride ?? resolveMode(searchParams, forceTailored);

  if (mode === 'tailored') {
    return <JobTailoredCVEditor />;
  }
  return <CVEditor />;
}

/**
 * Single CV editor entry point for core and tailored modes.
 * Routes: /cv/edit, /cv/edit/[id], /cv/edit/[id]?tailored=true
 */
export function UnifiedCVEditor({
  forceTailored,
  mode,
}: {
  forceTailored?: boolean;
  mode?: CVEditorMode;
}) {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--color-muted)]">Loading editor…</p>}>
      <UnifiedCVEditorInner forceTailored={forceTailored} mode={mode} />
    </Suspense>
  );
}
