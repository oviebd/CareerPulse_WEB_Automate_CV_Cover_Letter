'use client';

import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { useMemo } from 'react';
import { Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ATSBadge } from '@/components/shared/ATSBadge';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { UpgradeCTA } from '@/components/shared/UpgradeCTA';
import { useCVProfile } from '@/hooks/useCV';
import { useCoverLettersList } from '@/hooks/useCoverLetters';
import { useJobApplications } from '@/hooks/useTracker';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuthStore } from '@/stores/useAuthStore';
import { formatDate } from '@/lib/utils';
import { TIER_LIMITS } from '@/types';
import { fadeUp, staggerChildren } from '@/lib/animations';

export default function DashboardPage() {
  const reduce = useReducedMotion();
  const profile = useAuthStore((s) => s.profile);
  const { tier, limits } = useSubscription();
  const { data: cv, isLoading: cvLoading } = useCVProfile();
  const { data: letters = [], isLoading: clLoading } = useCoverLettersList();
  const { data: apps = [], isLoading: appLoading } = useJobApplications();

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const genLimit = TIER_LIMITS[tier].generationsPerMonth;

  const { activeApps, usedThisMonth, pct, statusCounts } = useMemo(() => {
    const active = apps.filter((a) => !['rejected', 'withdrawn'].includes(a.status));
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const used = letters.filter((l) => {
      const d = new Date(l.created_at);
      return d.getMonth() === month && d.getFullYear() === year;
    }).length;
    const p =
      genLimit === Number.POSITIVE_INFINITY
        ? 0
        : Math.min(100, (used / genLimit) * 100);
    const counts: Record<string, number> = {};
    for (const a of apps) {
      counts[a.status] = (counts[a.status] ?? 0) + 1;
    }
    return { activeApps: active, usedThisMonth: used, pct: p, statusCounts: counts };
  }, [apps, letters, genLimit]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        title={`${greeting}, ${profile?.full_name?.split(' ')[0] || 'there'}`}
        subtitle={`${activeApps.length} active application${activeApps.length === 1 ? '' : 's'}`}
        actions={
          <>
          <Link href="/cover-letters/new">
            <Button variant="primary" size="sm">New cover letter</Button>
          </Link>
          <Link href="/cv/upload">
            <Button variant="secondary" size="sm">Upload CV</Button>
          </Link>
          <Link href="/tracker">
            <Button variant="secondary" size="sm">Open tracker</Button>
          </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active applications" value={activeApps.length} helper="Current pipeline" />
        <StatCard label="Letters this month" value={usedThisMonth} helper="Usage tracker" />
        <StatCard label="CV completion" value={cv?.completion_percentage ?? 0} helper="Profile quality" accent="var(--color-secondary-500)" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card hoverable>
          <h2 className="font-display font-semibold text-[var(--color-secondary)]">
            CV profile
          </h2>
          {cvLoading ? (
            <Skeleton className="mt-4 h-24 w-full" />
          ) : cv ? (
            <>
              <motion.div className="mt-4 flex items-center gap-3" initial={reduce ? undefined : { opacity: 0 }} animate={reduce ? undefined : { opacity: 1 }}>
                <Progress value={cv.completion_percentage} className="flex-1" />
                <span className="text-sm font-medium">{cv.completion_percentage}%</span>
              </motion.div>
              <p className="mt-2 text-xs text-[var(--color-muted)]">
                Updated {formatDate(cv.updated_at)} · Template{' '}
                {cv.preferred_cv_template_id}
              </p>
              <Link
                href="/cv/edit"
                className="mt-4 inline-block text-sm font-semibold text-[var(--color-primary)]"
              >
                Edit profile
              </Link>
            </>
          ) : (
            <p className="mt-4 text-sm text-[var(--color-muted)]">
              No CV profile yet.{' '}
              <Link href="/cv/upload" className="font-medium text-[var(--color-primary)]">
                Upload
              </Link>
            </p>
          )}
        </Card>

        <Card hoverable>
          <h2 className="font-display font-semibold">Monthly usage</h2>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Cover letter generations this month:{' '}
            <strong>
              {usedThisMonth}
              {genLimit === Number.POSITIVE_INFINITY ? '' : ` / ${genLimit}`}
            </strong>
          </p>
          {genLimit !== Number.POSITIVE_INFINITY ? (
            <Progress value={pct} className="mt-3" />
          ) : null}
          {pct > 80 && genLimit !== Number.POSITIVE_INFINITY ? (
            <div className="mt-4">
              <UpgradeCTA />
            </div>
          ) : null}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card hoverable>
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold">Recent cover letters</h2>
            <Link href="/cover-letters" className="text-sm text-[var(--color-primary)]">
              View all
            </Link>
          </div>
          {clLoading ? (
            <Skeleton className="mt-4 h-20 w-full" />
          ) : (
            <motion.ul
              className="mt-4 space-y-3"
              variants={reduce ? undefined : staggerChildren}
              initial={reduce ? undefined : 'initial'}
              animate={reduce ? undefined : 'animate'}
            >
              {letters.slice(0, 3).map((l) => (
                <motion.li
                  key={l.id}
                  variants={reduce ? undefined : fadeUp}
                  className="flex items-center justify-between rounded-lg border border-[var(--color-border)] p-3 text-sm transition hover:bg-[var(--color-surface-2)]"
                >
                  <div>
                    <div className="font-medium">{l.company_name || 'Company'}</div>
                    <div className="text-[var(--color-muted)]">{l.job_title || 'Role'}</div>
                  </div>
                  <div className="text-right">
                    {l.ats_score != null ? (
                      <ATSBadge score={l.ats_score} />
                    ) : (
                      <span className="text-xs text-[var(--color-muted)]">—</span>
                    )}
                    <button type="button" className="ml-2 text-amber-500">
                      <Star className="h-4 w-4" />
                    </button>
                    <div className="text-xs text-[var(--color-muted)]">
                      {formatDate(l.created_at)}
                    </div>
                  </div>
                </motion.li>
              ))}
              {letters.length === 0 ? (
                <li className="text-sm text-[var(--color-muted)]">
                  No letters yet.{' '}
                  <Link href="/cover-letters/new" className="text-[var(--color-primary)]">
                    Generate one
                  </Link>
                </li>
              ) : null}
            </motion.ul>
          )}
        </Card>

        <Card hoverable>
          <h2 className="font-display font-semibold">Tracker snapshot</h2>
          {appLoading ? (
            <Skeleton className="mt-4 h-20 w-full" />
          ) : limits.trackerAccess ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {Object.entries(statusCounts).map(([s, n]) => (
                <Badge key={s} variant="default">
                  {s}: {n}
                </Badge>
              ))}
              {apps.length === 0 ? (
                <p className="text-sm text-[var(--color-muted)]">
                  <Link href="/tracker" className="text-[var(--color-primary)]">
                    Add your first application
                  </Link>
                </p>
              ) : null}
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-sm text-[var(--color-muted)]">
                Application tracker is available on Pro and above.
              </p>
              <UpgradeCTA className="mt-4" />
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {(cv?.completion_percentage ?? 0) < 60 ? (
          <Card padding="sm" className="border-amber-200 bg-amber-50/50">
            <p className="text-sm font-medium">Complete your CV profile</p>
            <Link href="/cv/edit" className="mt-2 text-xs text-[var(--color-primary)]">
              Open editor
            </Link>
          </Card>
        ) : null}
        {letters.length === 0 ? (
          <Card padding="sm" className="border-blue-200 bg-blue-50/50">
            <p className="text-sm font-medium">Generate your first cover letter</p>
            <Link href="/cover-letters/new" className="mt-2 text-xs text-[var(--color-primary)]">
              Start
            </Link>
          </Card>
        ) : null}
        {apps.length === 0 && limits.trackerAccess ? (
          <Card padding="sm" className="border-slate-200">
            <p className="text-sm font-medium">Track your applications</p>
            <Link href="/tracker" className="mt-2 text-xs text-[var(--color-primary)]">
              Open board
            </Link>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
