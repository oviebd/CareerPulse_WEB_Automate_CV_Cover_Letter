'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  Mail,
  Pencil,
  Plus,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ContextualAITools } from '@/components/applications/ContextualAITools';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Tabs } from '@/components/ui/tabs';
import {
  APPLICATION_COLUMN_CONFIG,
  jobStatusToColumn,
} from '@/lib/job-status-ui';
import type { Job } from '@/types/database';

export default function ApplicationDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const [activeTab, setActiveTab] = useState('overview');
  const [notes, setNotes] = useState('');
  const [notesSaved, setNotesSaved] = useState(false);

  const { data: job, isLoading } = useQuery({
    queryKey: ['job-detail', id],
    queryFn: async (): Promise<Job | null> => {
      const res = await fetch(`/api/jobs/${id}`);
      if (!res.ok) return null;
      return res.json() as Promise<Job>;
    },
    enabled: Boolean(id),
  });

  const column = useMemo(
    () => (job ? jobStatusToColumn(job.status) : null),
    [job]
  );
  const cfg = column ? APPLICATION_COLUMN_CONFIG[column] : null;

  const linkedCVs = job?.cvs ?? [];
  const linkedCLs = job?.cover_letters ?? [];
  const hasDocuments = linkedCVs.length > 0 || linkedCLs.length > 0;

  async function saveNotes() {
    if (!job) return;
    await fetch(`/api/jobs/${job.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    });
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  }

  if (isLoading) {
    return <Skeleton className="mx-auto h-64 max-w-4xl rounded-xl" />;
  }

  if (!job) {
    return (
      <div className="mx-auto max-w-4xl text-center">
        <p className="text-[var(--color-muted)]">Application not found.</p>
        <Link href="/dashboard" className="mt-4 inline-block text-[var(--color-primary)]">
          ← Back to Applications
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-primary)]"
      >
        <ArrowLeft className="h-4 w-4" /> Applications
      </Link>

      <PageHeader
        title={job.job_title || 'Untitled role'}
        subtitle={job.company_name || 'Company'}
        actions={
          cfg ? (
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${cfg.bgColor} ${cfg.textColor}`}
            >
              {cfg.emoji} {cfg.label}
            </span>
          ) : null
        }
      />

      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'documents', label: `Documents${hasDocuments ? ` (${linkedCVs.length + linkedCLs.length})` : ''}` },
          { id: 'notes', label: 'Notes' },
        ]}
        value={activeTab}
        onChange={setActiveTab}
      />

      {/* ── Notes tab ── */}
      {activeTab === 'notes' ? (
        <Card className="space-y-3">
          <Textarea
            value={notes || job.notes || ''}
            onChange={(e) => setNotes(e.target.value)}
            rows={6}
            placeholder="Interview notes, contacts, next steps…"
          />
          <Button size="sm" variant="primary" onClick={() => void saveNotes()}>
            {notesSaved ? 'Saved' : 'Save notes'}
          </Button>
        </Card>
      ) : null}

      {/* ── Documents tab ── */}
      {activeTab === 'documents' ? (
        <div className="space-y-4">
          {/* Generate CTA */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--color-muted)]">
              {hasDocuments
                ? 'Documents generated for this application.'
                : 'No documents yet. Generate a tailored resume and cover letter for this role.'}
            </p>
            <Link href="/applications/new">
              <Button variant="primary" size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                {hasDocuments ? 'Generate another' : 'Generate documents'}
              </Button>
            </Link>
          </div>

          {/* Linked Resumes */}
          {linkedCVs.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                Resumes
              </h3>
              {linkedCVs.map((cv) => (
                <div
                  key={cv.id}
                  className="flex items-center gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary-100)]">
                    <FileText className="h-5 w-5 text-[var(--color-primary)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-[var(--color-text-primary)]">
                      {cv.title || 'Tailored Resume'}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--color-muted)]">Resume</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Link href={`/cv/edit/${cv.id}?tailored=true`}>
                      <Button variant="secondary" size="sm" className="gap-1.5">
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {/* Linked Cover Letters */}
          {linkedCLs.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                Cover Letters
              </h3>
              {linkedCLs.map((cl) => (
                <div
                  key={cl.id}
                  className="flex items-center gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/40">
                    <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-[var(--color-text-primary)]">
                      {cl.title || 'Cover Letter'}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--color-muted)]">Cover letter</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Link href={`/cover-letters/${cl.id}`}>
                      <Button variant="secondary" size="sm" className="gap-1.5">
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {!hasDocuments ? (
            <div className="rounded-xl border border-dashed border-[var(--color-border)] py-12 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-surface-2)]">
                <FileText className="h-6 w-6 text-[var(--color-muted)]" />
              </div>
              <p className="font-medium text-[var(--color-text-primary)]">No documents yet</p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                Generate a tailored resume and cover letter for{' '}
                {job.company_name || 'this role'}.
              </p>
              <Link href="/applications/new" className="mt-4 inline-block">
                <Button variant="primary" size="sm" className="gap-1.5">
                  <Plus className="h-4 w-4" /> Generate documents
                </Button>
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ── Overview tab ── */}
      {activeTab === 'overview' ? (
        <div className="space-y-4">
          <Card className="flex flex-wrap gap-3">
            {linkedCVs[0] ? (
              <Link href={`/cv/edit/${linkedCVs[0].id}?tailored=true`}>
                <Button variant="secondary" size="sm" icon={<Pencil className="h-4 w-4" />}>
                  Edit tailored resume
                </Button>
              </Link>
            ) : (
              <Link href="/applications/new">
                <Button variant="primary" size="sm">
                  Generate tailored resume
                </Button>
              </Link>
            )}
            {linkedCLs[0] ? (
              <Link href={`/cover-letters/${linkedCLs[0].id}`}>
                <Button variant="secondary" size="sm" icon={<Mail className="h-4 w-4" />}>
                  Cover letter
                </Button>
              </Link>
            ) : (
              <Link href="/applications/new">
                <Button variant="secondary" size="sm" icon={<Mail className="h-4 w-4" />}>
                  Generate cover letter
                </Button>
              </Link>
            )}
            {job.job_url ? (
              <a href={job.job_url} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm" icon={<ExternalLink className="h-4 w-4" />}>
                  Job posting
                </Button>
              </a>
            ) : null}
          </Card>

          <ContextualAITools
            jobId={job.id}
            status={job.status}
            jobSummary={job.job_summary}
          />
        </div>
      ) : null}
    </div>
  );
}
