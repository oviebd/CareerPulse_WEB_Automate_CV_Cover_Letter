import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { BuildCvLink } from '@/components/marketing/BuildCvLink';
import { HeroAbstractArt } from '@/components/marketing/HeroAbstractArt';

export function LandingHero() {
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-10 sm:px-6 lg:px-8 lg:pb-28 lg:pt-16">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-[var(--color-primary-500)]">
            Your career application hub
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-5xl lg:text-[3.2rem] lg:leading-tight">
            Tailored applications, tracked jobs, and interview-ready confidence
          </h1>
          <p className="mt-5 max-w-xl text-lg text-[var(--color-muted)]">
            Paste a job description for AI-tailored CVs and cover letters. Track every
            application on one board. Prepare for interviews with topics, quizzes, and mock
            sessions — all in one calm workspace.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/register?returnTo=%2Fapplications%2Fnew"
              className="inline-flex items-center gap-2 rounded-btn bg-[var(--color-primary-500)] px-6 py-3.5 text-base font-semibold text-white shadow-lg transition hover:brightness-110 active:scale-[0.99]"
            >
              Paste job description
              <ArrowRight className="h-4 w-4" />
            </Link>
            <BuildCvLink
              className="inline-flex items-center justify-center rounded-btn border-2 border-[var(--color-border)] bg-[var(--color-surface)]/60 px-6 py-3.5 text-base font-semibold text-[var(--color-text-primary)] backdrop-blur transition hover:border-[var(--color-primary-300)] hover:text-[var(--color-primary-500)]"
            >
              Build CV from scratch
            </BuildCvLink>
          </div>
        </div>
        <div className="relative">
          <div className="glass-panel relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/50 p-4 shadow-2xl sm:p-6">
            <HeroAbstractArt variant="hero" />
            <p className="mt-2 text-center text-xs text-[var(--color-muted)]">
              CVs, cover letters, tracker, and interview prep — unified
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
