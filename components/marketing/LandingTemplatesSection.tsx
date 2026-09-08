'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, FileText, Mail } from 'lucide-react';
import type { CVTemplate } from '@/types';
import { LandingTemplateGrid } from '@/components/marketing/LandingTemplateGrid';
import { cn } from '@/lib/utils';

type Tab = 'cv' | 'cover_letter';

type Props = {
  cvTemplates: CVTemplate[];
  coverLetterTemplates: CVTemplate[];
};

export function LandingTemplatesSection({ cvTemplates, coverLetterTemplates }: Props) {
  const [tab, setTab] = useState<Tab>('cv');
  const activeTemplates = tab === 'cv' ? cvTemplates : coverLetterTemplates;
  const proCount = activeTemplates.filter((t) => t.is_premium).length;
  const freeCount = activeTemplates.length - proCount;

  return (
    <section id="templates" className="scroll-mt-20 px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold text-[var(--color-text-primary)] sm:text-3xl">
            Professional templates
          </h2>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Same CV and cover letter layouts as in the app. Pro templates are marked — sign up
            free to export.
          </p>
        </div>

        <div className="mx-auto mt-8 flex max-w-md items-center justify-center gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/50 p-1">
          <button
            type="button"
            onClick={() => setTab('cv')}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition',
              tab === 'cv'
                ? 'bg-[var(--color-primary-500)] text-white shadow-sm'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-hover-surface)]'
            )}
          >
            <FileText className="h-4 w-4" aria-hidden />
            CV ({cvTemplates.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('cover_letter')}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition',
              tab === 'cover_letter'
                ? 'bg-[var(--color-primary-500)] text-white shadow-sm'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-hover-surface)]'
            )}
          >
            <Mail className="h-4 w-4" aria-hidden />
            Cover letter ({coverLetterTemplates.length})
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-[var(--color-muted)]">
          {freeCount} free · {proCount} Pro
        </p>

        <LandingTemplateGrid
          templates={activeTemplates}
          kind={tab}
          columns={tab === 'cover_letter' ? 'cover_letter' : 'default'}
        />

        <div className="mt-10 text-center">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-btn bg-[var(--color-primary-500)] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
          >
            Start with a template
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
