import Link from 'next/link';
import { Card } from '@/components/ui/card';

const btn =
  'inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition';
const primary = `${btn} bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]`;
const secondary = `${btn} border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-slate-50`;

export default function CVOverviewPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-2xl font-bold">CV</h1>
      <p className="text-sm text-[var(--color-muted)]">
        Manage your master profile, upload a new file, pick templates, and export PDFs.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="font-semibold">Upload</h2>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            PDF or DOCX up to 10MB. We extract structure with AI.
          </p>
          <Link href="/cv/upload" className={`${primary} mt-4 inline-flex`}>
            Upload CV
          </Link>
        </Card>
        <Card>
          <h2 className="font-semibold">Edit &amp; templates</h2>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Fine-tune sections and choose export layouts.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/cv/edit" className={`${secondary} px-3 py-2 text-sm`}>
              Edit
            </Link>
            <Link href="/cv/templates" className={`${secondary} px-3 py-2 text-sm`}>
              Templates
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
