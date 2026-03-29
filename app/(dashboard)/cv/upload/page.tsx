import Link from 'next/link';
import { CVUploadForm } from '@/components/cv/CVUploadForm';

export default function CVUploadPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-bold">Upload CV</h1>
        <Link href="/cv/edit" className="text-sm text-[var(--color-primary)]">
          Skip — edit manually
        </Link>
      </div>
      <CVUploadForm />
    </div>
  );
}
