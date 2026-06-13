'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Briefcase, FileText, MessageSquare, Trophy } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PrimaryActionBar } from '@/components/shared/PrimaryActionBar';
import { Button } from '@/components/ui/button';
import { AddJobModal } from '@/components/jobs/AddJobModal';
import { useAuthStore } from '@/stores/useAuthStore';
import { useJobApplications } from '@/hooks/useTracker';
import { jobStatusToColumn } from '@/lib/job-status-ui';

const KanbanBoard = dynamic(
  () =>
    import('@/components/jobs/KanbanBoard').then((m) => ({
      default: m.KanbanBoard,
    })),
  { ssr: false, loading: () => <p className="text-sm text-[var(--color-muted)]">Loading board…</p> }
);

export default function HomePage() {
  const profile = useAuthStore((s) => s.profile);
  const { data: apps = [] } = useJobApplications();
  const [addJobOpen, setAddJobOpen] = useState(false);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const stats = useMemo(() => {
    const applied = apps.filter((a) => jobStatusToColumn(a.status) === 'applied').length;
    const interviews = apps.filter((a) => jobStatusToColumn(a.status) === 'interview').length;
    const offers = apps.filter((a) => jobStatusToColumn(a.status) === 'offer').length;
    const active = apps.filter((a) => {
      const col = jobStatusToColumn(a.status);
      return col && col !== 'rejected' && col !== 'archived';
    }).length;
    return { active, applied, interviews, offers };
  }, [apps]);

  return (
    <div className="mx-auto max-w-full space-y-6">
      <PageHeader
        title={`${greeting}, ${profile?.full_name?.split(' ')[0] || 'there'}`}
        subtitle={`${stats.active} active application${stats.active === 1 ? '' : 's'}`}
        actions={
          <PrimaryActionBar>
            <Link href="/applications/new">
              <Button variant="primary" size="md">
                + New Application
              </Button>
            </Link>
            <Button variant="secondary" size="md" onClick={() => setAddJobOpen(true)}>
              Track manually
            </Button>
          </PrimaryActionBar>
        }
      />

      {/* Quick stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Active', value: stats.active, icon: Briefcase, color: 'text-[var(--color-primary)]', bg: 'bg-[var(--color-primary-100)]' },
          { label: 'Applied', value: stats.applied, icon: FileText, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/40' },
          { label: 'Interviews', value: stats.interviews, icon: MessageSquare, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/40' },
          { label: 'Offers', value: stats.offers, icon: Trophy, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/40' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
          >
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${bg}`}>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <div>
              <p className="text-xl font-bold leading-none text-[var(--color-text-primary)]">{value}</p>
              <p className="mt-0.5 text-xs text-[var(--color-muted)]">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <KanbanBoard />

      <AddJobModal
        isOpen={addJobOpen}
        onClose={() => setAddJobOpen(false)}
      />
    </div>
  );
}
