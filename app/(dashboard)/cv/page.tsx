'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';
import { PrimaryActionBar } from '@/components/shared/PrimaryActionBar';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { useCoreCVVersions, useDeleteCoreCVVersion } from '@/hooks/useCV';
import { CoreCVCard } from '@/components/cv/dashboard/CVCard';
import { relativeTime } from '@/components/cv/dashboard/cv-dashboard-utils';

export default function MyCVPage() {
  const { toast } = useToast();
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const { data: versions = [], isLoading } = useCoreCVVersions();
  const deleteCore = useDeleteCoreCVVersion();

  const primary = versions[0];
  const otherVersions = versions.slice(1);

  const handleDelete = async (id: string) => {
    try {
      await deleteCore.mutateAsync(id);
      toast('CV version deleted.', 'success');
    } catch {
      toast('Failed to delete.', 'error');
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        title="My CV"
        subtitle="Your base CV powers every tailored application."
        actions={
          <PrimaryActionBar>
            <Link href="/cv/upload">
              <Button variant="secondary" size="sm">
                Upload CV
              </Button>
            </Link>
            <Link href="/cv/edit">
              <Button variant="primary" size="sm">
                Edit CV
              </Button>
            </Link>
          </PrimaryActionBar>
        }
      />

      <section className="space-y-4">
        <SectionHeader title="Base CV" description="Primary profile used when tailoring applications." />
        <Card hoverable>
          {isLoading ? (
            <p className="text-sm text-[var(--color-muted)]">Loading…</p>
          ) : primary ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-[var(--color-text-primary)]">
                  {primary.name || primary.full_name || 'My CV'}
                </p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  {primary.completion_percentage}% complete · Updated{' '}
                  {relativeTime(primary.updated_at)}
                </p>
                <p className="mt-1 text-xs text-[var(--color-muted)]">
                  Template: {primary.preferred_template_id || 'classic'}
                </p>
              </div>
              <Link href={`/cv/edit/${primary.id}`}>
                <Button variant="primary" size="sm">
                  Edit
                </Button>
              </Link>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-[var(--color-muted)]">No CV yet.</p>
              <Link href="/cv/upload" className="mt-3 inline-block">
                <Button variant="primary" size="sm">
                  Upload or build your CV
                </Button>
              </Link>
            </div>
          )}
        </Card>
      </section>

      {otherVersions.length > 0 ? (
        <section className="space-y-3">
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-faint)] px-4 py-3 text-left text-sm font-semibold"
            onClick={() => setVersionsOpen((o) => !o)}
          >
            Versions ({otherVersions.length})
            {versionsOpen ? (
              <ChevronUp className="h-4 w-4 text-[var(--color-muted)]" />
            ) : (
              <ChevronDown className="h-4 w-4 text-[var(--color-muted)]" />
            )}
          </button>
          {versionsOpen ? (
            <div className="space-y-2">
              {otherVersions.map((v) => (
                <div key={v.id}>
                  <CoreCVCard
                    cv={v}
                    onDelete={() => {
                      if (confirmDeleteId === v.id) {
                        setConfirmDeleteId(null);
                        void handleDelete(v.id);
                        return;
                      }
                      setConfirmDeleteId(v.id);
                    }}
                  />
                  {confirmDeleteId === v.id ? (
                    <p className="mt-1 text-xs text-red-600">Click delete again to confirm.</p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <section>
        <Link
          href="/cv/templates"
          className="text-sm font-semibold text-[var(--color-primary)] hover:underline"
        >
          Browse templates →
        </Link>
      </section>
    </div>
  );
}
