'use client';

import Link from 'next/link';
import { ArrowRight, Brain, HelpCircle, ListChecks, Mic } from 'lucide-react';
import { HeroAbstractArt } from '@/components/marketing/HeroAbstractArt';
import { useAuthStore } from '@/stores/useAuthStore';

const capabilities = [
  {
    icon: ListChecks,
    title: 'Topics',
    description: 'AI-generated focus areas tailored to your role or chosen topics.',
  },
  {
    icon: HelpCircle,
    title: 'Likely questions',
    description: 'Practice answers to questions recruiters ask for your profile.',
  },
  {
    icon: Brain,
    title: 'Quizzes',
    description: 'Test your knowledge and track readiness with scored quizzes.',
  },
  {
    icon: Mic,
    title: 'Mock interview',
    description: 'Run practice or realistic mock sessions with timed feedback.',
  },
] as const;

export function LandingInterviewPrep() {
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const ctaHref =
    initialized && user ? '/interview' : '/register?returnTo=%2Finterview';

  return (
    <section
      id="interview"
      className="scroll-mt-20 border-t border-[var(--color-border)] px-4 py-16 sm:px-6"
    >
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
        <div className="glass-panel overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-4">
          <HeroAbstractArt variant="interview" />
        </div>
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-[var(--color-primary-500)]">
            Interview preparation
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold text-[var(--color-text-primary)] sm:text-3xl">
            Walk into interviews prepared
          </h2>
          <p className="mt-3 text-[var(--color-muted)]">
            Match your CV to a specific job for tailored prep, or choose topics and goals
            without a job application. Build confidence with structured practice before the
            real thing.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {capabilities.map((c) => (
              <div
                key={c.title}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)]/40 p-4"
              >
                <c.icon
                  className="h-5 w-5 text-[var(--color-primary-500)]"
                  aria-hidden
                />
                <h3 className="mt-2 text-sm font-semibold text-[var(--color-text-primary)]">
                  {c.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted)]">
                  {c.description}
                </p>
              </div>
            ))}
          </div>
          <Link
            href={ctaHref}
            className="mt-8 inline-flex items-center gap-2 rounded-btn bg-[var(--color-primary-500)] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
          >
            Start interview prep
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
