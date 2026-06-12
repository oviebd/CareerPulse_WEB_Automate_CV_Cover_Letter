'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, FileText, Mail, Pencil } from 'lucide-react';
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

  const cvId = job?.cvs?.[0]?.id;
  const clId = job?.cover_letters?.[0]?.id;

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
          ← Back to Home
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
        <ArrowLeft className="h-4 w-4" /> Home
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
          { id: 'notes', label: 'Notes' },
        ]}
        value={activeTab}
        onChange={setActiveTab}
      />

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
      ) : (
        <div className="space-y-4">
          <Card className="flex flex-wrap gap-3">
            {cvId ? (
              <Link href={`/cv/edit/${cvId}?tailored=true`}>
                <Button variant="secondary" size="sm" icon={<Pencil className="h-4 w-4" />}>
                  Edit tailored CV
                </Button>
              </Link>
            ) : (
              <Link href="/applications/new">
                <Button variant="primary" size="sm">
                  Generate tailored CV
                </Button>
              </Link>
            )}
            {clId ? (
              <Link href={`/cover-letters/${clId}`}>
                <Button variant="secondary" size="sm" icon={<Mail className="h-4 w-4" />}>
                  Cover letter
                </Button>
              </Link>
            ) : null}
            {cvId ? (
              <span className="inline-flex items-center gap-1 text-xs text-[var(--color-muted)]">
                <FileText className="h-3.5 w-3.5" /> CV attached
              </span>
            ) : null}
          </Card>

          <ContextualAITools
            jobId={job.id}
            status={job.status}
            jobSummary={job.job_summary}
          />
        </div>
      )}
    </div>
  );
}
