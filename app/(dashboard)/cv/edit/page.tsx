import { Suspense } from 'react';
import { UnifiedCVEditor } from '@/components/cv/UnifiedCVEditor';
import { CVEditorErrorBoundary } from '@/components/cv/CVEditorErrorBoundary';

export default function CVEditPage() {
  return (
    <CVEditorErrorBoundary>
      <Suspense fallback={<p className="text-sm text-[var(--color-muted)]">Loading…</p>}>
        <UnifiedCVEditor />
      </Suspense>
    </CVEditorErrorBoundary>
  );
}
