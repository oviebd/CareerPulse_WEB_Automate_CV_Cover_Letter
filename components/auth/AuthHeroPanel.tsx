import {
  CheckCircle2,
  FileText,
  Kanban,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const loginCopy = {
  kicker: 'Your career hub',
  title: 'Pick up where you left off',
  description:
    'Access your saved CVs, tailored cover letters, and application pipeline in one calm workspace.',
  footnote: 'Professional documents and tracking for job seekers worldwide.',
} as const;

const registerCopy = {
  kicker: 'Get started free',
  title: 'Build applications that stand out',
  description:
    'Create a free account to save your work, export polished PDFs, and use AI with your content—no card required.',
  footnote: 'Your data stays private. We use industry-standard security.',
} as const;

const features = [
  {
    icon: FileText,
    text: 'CV & cover letter editor with live preview',
  },
  {
    icon: Sparkles,
    text: 'Context-aware suggestions for bullets and summary',
  },
  {
    icon: Kanban,
    text: 'Application tracker from first draft to offer',
  },
  {
    icon: CheckCircle2,
    text: 'Export to PDF and Word when you are signed in',
  },
] as const;

type Variant = 'login' | 'register';

export function AuthHeroPanel({ variant }: { variant: Variant }) {
  const c = variant === 'login' ? loginCopy : registerCopy;

  return (
    <div
      className={cn(
        'relative hidden min-h-0 flex-col justify-between overflow-hidden',
        'border-r border-[var(--color-border)]',
        'bg-gradient-to-br from-[var(--auth-hero-from)] via-[var(--auth-hero-via)] to-[var(--auth-hero-to)]',
        'px-8 py-10 sm:px-10',
        'lg:flex lg:min-h-screen'
      )}
    >
      <div
        className="pointer-events-none absolute -right-24 -top-20 h-80 w-80 rounded-full bg-[var(--color-primary-500)]/[0.18] blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-[var(--color-accent-mint)]/[0.12] blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-px w-[min(100%,32rem)] -translate-x-1/2 bg-gradient-to-r from-transparent via-[var(--color-border)]/60 to-transparent"
        aria-hidden
      />

      <div className="relative z-10 flex flex-1 flex-col justify-center gap-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-primary-500)]">
            {c.kicker}
          </p>
          <h1 className="mt-3 max-w-md font-display text-3xl font-bold leading-tight tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
            {c.title}
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-[var(--color-muted)]">
            {c.description}
          </p>
          <ul className="mt-8 max-w-md space-y-3.5" aria-label="What you can do in CareerPulse">
            {features.map((item) => (
              <li key={item.text} className="flex gap-3 text-sm">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-[var(--color-primary-500)]">
                  <item.icon className="h-4 w-4" strokeWidth={2} aria-hidden />
                </span>
                <span className="leading-snug text-[var(--color-text-secondary)]">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="max-w-md">
          <p className="text-xs font-medium text-[var(--color-muted)]">Preview</p>
          <div
            className="glass-panel mt-3 overflow-hidden rounded-2xl p-1 shadow-lg ring-1 ring-[var(--color-border)]/50"
            aria-hidden
          >
            <div className="rounded-[14px] bg-[var(--color-surface)]/50 p-4">
              <div className="flex items-start gap-3">
                <div
                  className="flex h-12 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-primary-500)] to-[var(--color-accent-mint)] text-[10px] font-bold text-white shadow-sm"
                >
                  CV
                </div>
                <div className="min-w-0 flex-1 space-y-2 pt-0.5">
                  <div className="h-2.5 w-2/3 max-w-[180px] rounded bg-[var(--color-text-primary)]/12" />
                  <div className="h-2 w-1/2 max-w-[120px] rounded bg-[var(--color-muted)]/25" />
                  <div className="h-1.5 w-full rounded bg-[var(--color-muted)]/15" />
                  <div className="h-1.5 w-11/12 rounded bg-[var(--color-muted)]/12" />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <div className="rounded-lg border border-[var(--color-border)]/60 bg-[var(--color-background)]/30 px-2 py-2.5 text-center">
                  <p className="text-[10px] font-medium text-[var(--color-muted)]">Active</p>
                  <p className="mt-0.5 font-display text-lg font-bold tabular-nums text-[var(--color-primary-500)]">
                    12
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--color-border)]/60 bg-[var(--color-background)]/30 px-2 py-2.5 text-center">
                  <p className="text-[10px] font-medium text-[var(--color-muted)]">Interviews</p>
                  <p className="mt-0.5 font-display text-lg font-bold tabular-nums text-[var(--color-text-primary)]">
                    3
                  </p>
                </div>
                <div className="col-span-2 rounded-lg border border-dashed border-[var(--color-border)]/80 bg-[var(--color-primary-500)]/5 px-2 py-2.5 sm:col-span-1">
                  <p className="text-[10px] font-medium text-[var(--color-primary-500)]">Next up</p>
                  <p className="mt-0.5 truncate text-xs text-[var(--color-text-secondary)]">
                    Product designer — Acme
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="relative z-10 mt-8 text-xs leading-relaxed text-[var(--color-muted)]/90 sm:mt-10">
        {c.footnote}
      </p>
    </div>
  );
}
