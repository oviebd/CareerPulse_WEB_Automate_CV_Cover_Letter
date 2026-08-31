'use client';

import { ArrowRight, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExportMenu } from '@/components/shared/ExportMenu';
import type { ExportFormat } from '@/lib/export-client';
import type { CVFormTab } from '@/components/cv/CVFormFields';
import { CORE_CV_FLOW, coreSectionMeta, nextCoreSectionTab } from '@/lib/cv-editor-flow';
import { cvCompletionPercent } from '@/lib/cv-sidebar-content';
import type { CVData } from '@/types';

interface EmptyCVGuideProps {
  cvData: CVData;
  activeTab: CVFormTab;
  onGoToSection: (tab: CVFormTab) => void;
  placement?: 'top' | 'bottom';
}

export function EmptyCVGuide({
  cvData,
  activeTab,
  onGoToSection,
  placement = 'top',
}: EmptyCVGuideProps) {
  const completion = cvCompletionPercent(cvData);
  const isEmpty = completion === 0;
  const nextTab = nextCoreSectionTab(activeTab);
  const nextMeta = nextTab ? coreSectionMeta(nextTab) : null;

  if (placement === 'bottom') {
    if (!nextMeta || !CORE_CV_FLOW.some((s) => s.id === activeTab)) return null;
    return (
      <div className="mt-6 flex flex-col items-stretch gap-2 border-t border-[var(--color-border)]/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
            Up next
          </p>
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">
            {nextMeta.label}
            <span className="ml-2 font-normal text-[var(--color-text-secondary)]">
              — {nextMeta.hint}
            </span>
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="shrink-0"
          onClick={() => onGoToSection(nextMeta.id)}
          icon={<ArrowRight className="h-4 w-4" />}
        >
          Continue to {nextMeta.label}
        </Button>
      </div>
    );
  }

  if (isEmpty && activeTab !== 'header' && activeTab !== 'photo' && activeTab !== 'design') {
    return null;
  }

  if (isEmpty && (activeTab === 'header' || activeTab === 'photo')) {
    return (
      <div className="mb-4 rounded-2xl border border-[var(--color-primary-200)]/60 bg-[var(--color-primary-50)] p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-100)] text-[var(--color-primary-500)]">
            <UserRound className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-base font-semibold text-[var(--color-text-primary)]">
              Start with your contact details
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Add your name, job title, email, and phone. You can fill in experience and skills
              after — we&apos;ll guide you step by step.
            </p>
            {activeTab !== 'header' ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="mt-4"
                onClick={() => onGoToSection('header')}
                icon={<ArrowRight className="h-4 w-4" />}
              >
                Go to Header
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export function ExportReadyNudge({
  completion,
  onExport,
  exportDisabled,
  busyFormat,
  canDocx,
}: {
  completion: number;
  onExport?: (format: ExportFormat) => void;
  exportDisabled?: boolean;
  busyFormat?: ExportFormat | null;
  canDocx?: boolean;
}) {
  if (completion < 80 || !onExport) return null;

  return (
    <div className="rounded-xl border border-[var(--color-accent-mint)]/35 bg-[var(--color-accent-mint)]/8 p-3">
      <p className="text-sm font-semibold text-[var(--color-text-primary)]">
        Core sections are complete
      </p>
      <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
        Export when you are ready. Core sections are {completion}% filled.
      </p>
      <div className="mt-2">
        <ExportMenu
          label="Export"
          fullWidth
          busyFormat={busyFormat ?? null}
          disabled={exportDisabled}
          canDocx={canDocx ?? false}
          onExport={onExport}
        />
      </div>
    </div>
  );
}
