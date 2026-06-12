'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { PageHeader } from '@/components/shared/PageHeader';
import { PrimaryActionBar } from '@/components/shared/PrimaryActionBar';
import { Button } from '@/components/ui/button';
import { HomeSidebar } from '@/components/dashboard/HomeSidebar';
import { useAuthStore } from '@/stores/useAuthStore';
import { useJobApplications } from '@/hooks/useTracker';
import { useSubscription } from '@/hooks/useSubscription';
import { jobStatusToColumn } from '@/lib/job-status-ui';

const ApplicationBoard = dynamic(
  () =>
    import('@/components/applications/ApplicationBoard').then((m) => ({
      default: m.ApplicationBoard,
    })),
  { ssr: false, loading: () => <p className="text-sm text-[var(--color-muted)]">Loading board…</p> }
);

export default function HomePage() {
  const profile = useAuthStore((s) => s.profile);
  const { tier } = useSubscription();
  const { data: apps = [] } = useJobApplications();

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const activeCount = useMemo(
    () =>
      apps.filter((a) => {
        const col = jobStatusToColumn(a.status);
        return col && col !== 'closed';
      }).length,
    [apps]
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={`${greeting}, ${profile?.full_name?.split(' ')[0] || 'there'}`}
        subtitle={`${activeCount} active application${activeCount === 1 ? '' : 's'}`}
        actions={
          <PrimaryActionBar>
            <Link href="/applications/new">
              <Button variant="primary" size="md">
                + Add Job
              </Button>
            </Link>
            {tier === 'free' ? (
              <Link href="/settings/billing">
                <Button variant="secondary" size="md">
                  Upgrade
                </Button>
              </Link>
            ) : null}
          </PrimaryActionBar>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section>
          <ApplicationBoard />
        </section>
        <HomeSidebar />
      </div>
    </div>
  );
}
