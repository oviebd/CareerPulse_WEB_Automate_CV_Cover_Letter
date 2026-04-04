import { Suspense } from 'react';
import { CVEditor } from '@/components/cv/CVEditor';
import { CVEditorErrorBoundary } from '@/components/cv/CVEditorErrorBoundary';

export default function CVEditWithIdPage() {
  return (
    <CVEditorErrorBoundary>
      <Suspense fallback={<p className="text-sm text-[var(--color-muted)]">Loading…</p>}>
        <CVEditor />
      </Suspense>
    </CVEditorErrorBoundary>
  );
}
