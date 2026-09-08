import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { BuildCvLink } from '@/components/marketing/BuildCvLink';

export function LandingFinalCta() {
  return (
    <section className="border-t border-[var(--color-border)] px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-display text-2xl font-bold text-[var(--color-text-primary)] sm:text-3xl">
          Ready to take control of your job search?
        </h2>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Create documents, track applications, and prepare for interviews — free to start.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-btn bg-[var(--color-primary-500)] px-8 py-3.5 text-base font-semibold text-white shadow-lg transition hover:brightness-110"
          >
            Get started free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <BuildCvLink
            className="inline-flex items-center gap-2 rounded-btn border-2 border-[var(--color-border)] bg-[var(--color-surface)]/60 px-6 py-3.5 text-base font-semibold text-[var(--color-text-primary)] transition hover:border-[var(--color-primary-300)]"
          >
            Build my CV
          </BuildCvLink>
        </div>
      </div>
    </section>
  );
}
