import Link from 'next/link';

export default function LandingPage() {
  return (
    <main>
      <section className="mx-auto max-w-5xl px-4 py-20 text-center">
        <h1 className="font-display text-4xl font-bold tracking-tight text-[var(--color-secondary)] sm:text-5xl">
          Upload once. Apply faster.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-[var(--color-muted)]">
          AI extracts your CV, generates tailored cover letters with optional ATS
          insight, and helps you track every application in one place.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/register"
            className="rounded-lg bg-[var(--color-primary)] px-6 py-3 text-base font-semibold text-white shadow hover:bg-[var(--color-primary-hover)]"
          >
            Get started
          </Link>
          <Link
            href="/pricing"
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-3 text-base font-semibold hover:bg-slate-50"
          >
            View pricing
          </Link>
        </div>
      </section>
      <section className="border-t border-[var(--color-border)] bg-[var(--color-surface)] py-16">
        <div className="mx-auto grid max-w-5xl gap-8 px-4 sm:grid-cols-3">
          {[
            {
              t: 'Structured CV profile',
              d: 'Upload PDF or DOCX; we structure your experience for reuse.',
            },
            {
              t: 'Streaming cover letters',
              d: 'Paste a job description and get a tailored letter in seconds.',
            },
            {
              t: 'Application tracker',
              d: 'Kanban board for saved → offer, with notes and links.',
            },
          ].map((x) => (
            <div key={x.t} className="rounded-xl border border-[var(--color-border)] p-6">
              <h3 className="font-display font-semibold">{x.t}</h3>
              <p className="mt-2 text-sm text-[var(--color-muted)]">{x.d}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
