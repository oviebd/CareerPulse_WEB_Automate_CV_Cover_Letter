'use client';

import Link from 'next/link';
import { GenerateCoverLetterForm } from '@/components/cover-letter/GenerateCoverLetterForm';

/** Cover-letter-only generation from a job description (no full application wizard). */
export default function CoverLetterFromJdPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Link href="/documents?tab=cover-letters" className="text-sm text-[var(--color-primary)]">
        ← Back to documents
      </Link>
      <div>
        <h1 className="font-display text-2xl font-bold">Cover letter from job description</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Paste a job posting and generate a tailored cover letter — without the full application bundle.
        </p>
      </div>
      <GenerateCoverLetterForm />
    </div>
  );
}
