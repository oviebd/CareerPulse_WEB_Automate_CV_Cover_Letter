'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type JobInputProps = {
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  jobUrl: string;
  onJobTitleChange: (v: string) => void;
  onCompanyNameChange: (v: string) => void;
  onJobDescriptionChange: (v: string) => void;
  onJobUrlChange: (v: string) => void;
  maxCharacters?: number;
};

export function JobInput({
  jobTitle,
  companyName,
  jobDescription,
  jobUrl,
  onJobTitleChange,
  onCompanyNameChange,
  onJobDescriptionChange,
  onJobUrlChange,
  maxCharacters = 3000,
}: JobInputProps) {
  const characterCount = jobDescription.length;

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">Step 2</p>
        <h2 className="font-display text-2xl font-semibold text-[var(--color-text-primary)]">Add target role details</h2>
        <p className="text-sm text-[var(--color-muted)]">
          Paste the full job description to maximize optimization quality.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Job title (optional)"
          placeholder="e.g. Senior Frontend Engineer"
          value={jobTitle}
          onChange={(e) => onJobTitleChange(e.target.value)}
        />
        <Input
          label="Company (optional)"
          placeholder="e.g. Stripe"
          value={companyName}
          onChange={(e) => onCompanyNameChange(e.target.value)}
        />
      </div>

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <div className="mb-3">
          <label className="text-sm font-medium text-[var(--color-text-primary)]" htmlFor="job-description-textarea">
            Job description
          </label>
        </div>

        <Input
          label="Job posting URL (optional)"
          type="url"
          placeholder="Used for job tracking/saving only"
          value={jobUrl}
          onChange={(e) => onJobUrlChange(e.target.value)}
          className="mb-3"
        />

        <Textarea
          id="job-description-textarea"
          placeholder="Paste responsibilities, requirements, skills, and keywords."
          value={jobDescription}
          onChange={(e) => onJobDescriptionChange(e.target.value)}
          className="min-h-[320px] text-[15px] leading-relaxed"
        />

        <div className="mt-3 flex items-center justify-between text-xs">
          <span className={cn('text-[var(--color-muted)]', characterCount < 100 && 'text-amber-700')}>
            Minimum 100 characters required to optimize
          </span>
          <span className="font-medium text-[var(--color-text-primary)]">
            {characterCount.toLocaleString()} / {maxCharacters.toLocaleString()}
          </span>
        </div>
      </div>
    </section>
  );
}
