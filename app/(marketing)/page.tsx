import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  FileUp,
  Layers,
  Sparkles,
  Wand2,
  Mail,
  Kanban,
  FileText,
} from 'lucide-react';
import { getCvTemplatesForLanding } from '@/lib/landing-cv-templates';
import { LandingTemplateGrid } from '@/components/marketing/LandingTemplateGrid';

/** Free stock image (Unsplash License — free to use). Document / desk context. */
const HERO_CV_PREVIEW_IMAGE =
  'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=1200&q=80';

export default async function LandingPage() {
  const cvTemplates = await getCvTemplatesForLanding();

  return (
    <main>
      <section className="relative overflow-hidden px-4 pb-20 pt-10 sm:px-6 lg:px-8 lg:pb-28 lg:pt-16">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-[var(--color-primary-500)]">
              Professional CV builder
            </p>
            <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-5xl lg:text-[3.2rem] lg:leading-tight">
              Build a CV that gets you hired
            </h1>
            <p className="mt-5 max-w-xl text-lg text-[var(--color-muted)]">
              Structured sections, live preview, and polished templates. Start free in your browser—no
              account needed to design your CV. Sign up to export, unlock AI, and save everything to
              the cloud.
            </p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              No account needed to get started.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/cv/builder?guest=true"
                className="inline-flex items-center gap-2 rounded-btn bg-[var(--color-primary-500)] px-6 py-3.5 text-base font-semibold text-white shadow-lg transition hover:brightness-110 active:scale-[0.99]"
              >
                Build my CV — free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#templates"
                className="inline-flex items-center justify-center rounded-btn border-2 border-[var(--color-border)] bg-[var(--color-surface)]/60 px-6 py-3.5 text-base font-semibold text-[var(--color-text-primary)] backdrop-blur transition hover:border-[var(--color-primary-300)] hover:text-[var(--color-primary-500)]"
              >
                View templates
              </a>
            </div>
          </div>
          <div className="relative">
            <div className="glass-panel relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/50 p-3 shadow-2xl sm:p-4">
              <figure className="m-0 overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={HERO_CV_PREVIEW_IMAGE}
                  alt="Resume and application documents on a desk"
                  width={800}
                  height={1000}
                  className="h-auto w-full object-cover"
                  loading="eager"
                  decoding="async"
                />
                <figcaption className="px-1 pt-3 text-center text-xs text-[var(--color-muted)]">
                  Live preview in the editor
                  <span className="sr-only">. Photo: Unsplash (free to use).</span>
                </figcaption>
              </figure>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--color-border)] bg-[var(--color-surface)]/40 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="font-display text-2xl font-bold text-[var(--color-text-primary)] sm:text-3xl">
            How it works
          </h2>
          <p className="mt-2 text-sm text-[var(--color-muted)]">Three quick steps to a polished CV</p>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {[
              {
                step: '1',
                title: 'Fill in your details',
                desc: 'Add experience, education, and skills in guided sections.',
                icon: FileText,
              },
              {
                step: '2',
                title: 'Choose a template',
                desc: 'Pick a layout that fits your industry and personality.',
                icon: Layers,
              },
              {
                step: '3',
                title: 'Export & apply',
                desc: 'Sign up free to export to PDF, use AI, and track applications.',
                icon: CheckCircle2,
              },
            ].map((s) => (
              <div
                key={s.step}
                className="glass-panel flex flex-col items-center rounded-2xl border border-[var(--color-border)] p-6 text-center"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary-500)]/15 text-sm font-bold text-[var(--color-primary-500)]">
                  {s.step}
                </span>
                <s.icon className="mt-4 h-8 w-8 text-[var(--color-primary-500)]" aria-hidden />
                <h3 className="mt-3 font-display text-lg font-semibold text-[var(--color-text-primary)]">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm text-[var(--color-muted)]">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="templates" className="scroll-mt-20 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="font-display text-2xl font-bold text-[var(--color-text-primary)] sm:text-3xl">
              Professional templates
            </h2>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Same templates as in the app—open a full interactive preview or start editing. Export
              when you create a free account.
            </p>
          </div>
          <LandingTemplateGrid templates={cvTemplates} />
        </div>
      </section>

      <section
        id="features"
        className="scroll-mt-20 border-t border-[var(--color-border)] bg-[var(--color-surface)]/35 px-4 py-16 sm:px-6"
      >
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="font-display text-2xl font-bold text-[var(--color-text-primary)] sm:text-3xl">
            Sign up free to unlock
          </h2>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Core editing works without an account. Create a free account for these tools.
          </p>
        </div>
        <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Wand2, t: 'AI suggestions', d: 'Rewrite bullets and summary with context-aware help.' },
            { icon: FileText, t: 'PDF & DOCX export', d: 'Download print-ready documents from the editor.' },
            { icon: Sparkles, t: 'Multiple saved CVs', d: 'Version and manage core CVs in your dashboard.' },
            { icon: Mail, t: 'Cover letter builder', d: 'Tailor letters to roles with the same design system.' },
            { icon: Kanban, t: 'Application tracker', d: 'Move applications from saved to offer in one board.' },
          ].map((f) => (
            <div
              key={f.t}
              className="flex gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)]/40 p-4 text-left"
            >
              <f.icon className="h-5 w-5 shrink-0 text-[var(--color-primary-500)]" />
              <div>
                <h3 className="font-medium text-[var(--color-text-primary)]">{f.t}</h3>
                <p className="mt-1 text-sm text-[var(--color-muted)]">{f.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-[var(--color-border)] bg-gradient-to-br from-[var(--color-primary-500)]/10 via-[var(--color-surface)] to-[var(--color-accent-mint)]/5 p-8 sm:p-10">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-500)]/20 text-[var(--color-primary-500)]">
                <FileUp className="h-5 w-5" />
              </div>
              <h2 className="mt-3 font-display text-xl font-bold text-[var(--color-text-primary)] sm:text-2xl">
                Regenerate your CV from a PDF
              </h2>
              <p className="mt-2 max-w-lg text-sm text-[var(--color-muted)]">
                Upload an existing PDF or Word file and we will extract structure and text so you can
                edit in the builder—no login required to start.
              </p>
            </div>
            <Link
              href="/cv/upload"
              className="shrink-0 inline-flex items-center gap-2 rounded-btn bg-[var(--color-primary-500)] px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
            >
              Try it now
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--color-border)] px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-2xl font-bold text-[var(--color-text-primary)] sm:text-3xl">
            Ready to build your CV?
          </h2>
          <p className="mt-2 text-sm text-[var(--color-muted)]">No credit card. No account required to start.</p>
          <Link
            href="/cv/builder?guest=true"
            className="mt-6 inline-flex items-center gap-2 rounded-btn bg-[var(--color-primary-500)] px-8 py-3.5 text-base font-semibold text-white shadow-lg transition hover:brightness-110"
          >
            Build my CV — free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}
