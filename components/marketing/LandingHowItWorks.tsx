import { CheckCircle2, FileText, Kanban, MessageSquare } from 'lucide-react';

const steps = [
  {
    step: '1',
    title: 'Create or upload your CV',
    description: 'Build from scratch or import a PDF — add a cover letter when you need one.',
    icon: FileText,
  },
  {
    step: '2',
    title: 'Paste a job description',
    description: 'Get tailored documents and an ATS score aligned to the role.',
    icon: CheckCircle2,
  },
  {
    step: '3',
    title: 'Track applications',
    description: 'Move jobs through your board from applied to interview to offer.',
    icon: Kanban,
  },
  {
    step: '4',
    title: 'Prepare for the interview',
    description: 'Topics, questions, quizzes, and mock sessions for the roles you want.',
    icon: MessageSquare,
  },
] as const;

export function LandingHowItWorks() {
  return (
    <section className="border-t border-[var(--color-border)] bg-[var(--color-surface)]/40 px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-5xl text-center">
        <h2 className="font-display text-2xl font-bold text-[var(--color-text-primary)] sm:text-3xl">
          How it works
        </h2>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          From first draft to interview day in four steps
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div
              key={s.step}
              className="glass-panel flex flex-col items-center rounded-2xl border border-[var(--color-border)] p-6 text-center"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary-500)]/15 text-sm font-bold text-[var(--color-primary-500)]">
                {s.step}
              </span>
              <s.icon
                className="mt-4 h-7 w-7 text-[var(--color-primary-500)]"
                aria-hidden
              />
              <h3 className="mt-3 font-display text-base font-semibold text-[var(--color-text-primary)]">
                {s.title}
              </h3>
              <p className="mt-2 text-sm text-[var(--color-muted)]">{s.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
