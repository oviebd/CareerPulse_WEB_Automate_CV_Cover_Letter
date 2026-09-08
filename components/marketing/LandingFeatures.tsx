import {
  FileText,
  Mail,
  Kanban,
  MessageSquare,
  FileUp,
  Download,
} from 'lucide-react';

const features = [
  {
    icon: FileText,
    title: 'AI-tailored CV',
    description: 'Paste a job description and get a role-specific resume with an ATS score.',
  },
  {
    icon: Mail,
    title: 'Cover letters',
    description: 'Generate or enhance cover letters that align with each job posting.',
  },
  {
    icon: Kanban,
    title: 'Application tracker',
    description: 'Move every application from applied to interview to offer on one board.',
  },
  {
    icon: MessageSquare,
    title: 'Interview prep',
    description: 'Prepare by job or topic with questions, quizzes, and mock interviews.',
  },
  {
    icon: FileUp,
    title: 'Import existing CV',
    description: 'Upload a PDF or Word file and edit it in a modern, structured builder.',
  },
  {
    icon: Download,
    title: 'Export',
    description: 'Export polished PDFs for free. Pro unlocks DOCX and premium templates.',
  },
] as const;

export function LandingFeatures() {
  return (
    <section
      id="features"
      className="scroll-mt-20 border-t border-[var(--color-border)] bg-[var(--color-surface)]/35 px-4 py-16 sm:px-6"
    >
      <div className="mx-auto max-w-5xl text-center">
        <h2 className="font-display text-2xl font-bold text-[var(--color-text-primary)] sm:text-3xl">
          Everything you need to land the role
        </h2>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          One platform for documents, tracking, and interview preparation.
        </p>
      </div>
      <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.title}
            className="glass-panel flex gap-4 rounded-2xl border border-[var(--color-border)] p-5 text-left transition hover:border-[var(--color-primary-200)]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-100)] text-[var(--color-primary-500)]">
              <f.icon className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h3 className="font-display font-semibold text-[var(--color-text-primary)]">
                {f.title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted)]">
                {f.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
