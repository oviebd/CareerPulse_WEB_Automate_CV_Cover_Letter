import Link from 'next/link';
import { CoverLetterUploadForm } from '@/components/cover-letter/CoverLetterUploadForm';

export default function CoverLetterUploadPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Upload Cover Letter</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Import a PDF or DOCX cover letter, then edit it in your chosen template.
          </p>
        </div>
        <Link href="/cover-letters/new" className="text-sm text-[var(--color-primary)]">
          ← Other options
        </Link>
      </div>
      <CoverLetterUploadForm />
    </div>
  );
}
