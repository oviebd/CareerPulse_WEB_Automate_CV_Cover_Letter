'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CVEditorPanel } from '@/components/cv/CVEditorPanel';
import {
  useJobSpecificCV,
  useUpdateJobSpecificCV,
} from '@/hooks/useJobSpecificCVs';
import type { CVData } from '@/types';

export default function JobCVEditPage() {
  const { id } = useParams<{ id: string }>();
  const { data: jobCV, isLoading } = useJobSpecificCV(id);
  const { update, isSaving, lastSaved } = useUpdateJobSpecificCV(id);
  const [showJD, setShowJD] = useState(false);

  const cvData: CVData | null = jobCV
    ? {
        full_name: jobCV.full_name ?? null,
        professional_title: jobCV.professional_title ?? null,
        email: jobCV.email ?? null,
        phone: jobCV.phone ?? null,
        location: jobCV.location ?? null,
        linkedin_url: jobCV.linkedin_url ?? null,
        portfolio_url: jobCV.portfolio_url ?? null,
        website_url: jobCV.website_url ?? null,
        address: null,
        photo_url: null,
        summary: jobCV.summary ?? null,
        experience: jobCV.experience ?? [],
        education: jobCV.education ?? [],
        skills: jobCV.skills ?? [],
        projects: jobCV.projects ?? [],
        certifications: jobCV.certifications ?? [],
        languages: jobCV.languages ?? [],
        awards: jobCV.awards ?? [],
        referrals: [],
      }
    : null;

  const handleChange = useCallback(
    (data: CVData) => {
      update({
        full_name: data.full_name,
        professional_title: data.professional_title,
        email: data.email,
        phone: data.phone,
        location: data.location,
        linkedin_url: data.linkedin_url,
        portfolio_url: data.portfolio_url,
        website_url: data.website_url,
        summary: data.summary,
        experience: data.experience,
        education: data.education,
        skills: data.skills,
        projects: data.projects,
        certifications: data.certifications,
        languages: data.languages,
        awards: data.awards,
      });
    },
    [update]
  );

  if (isLoading || !cvData || !jobCV) {
    return (
      <div className="mx-auto max-w-4xl">
        <p className="text-sm text-[var(--color-muted)]">Loading…</p>
      </div>
    );
  }

  const keywords = jobCV.keywords_added ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* Job CV banner */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="font-semibold text-blue-900">
              Job CV for {jobCV.job_title}
              {jobCV.company_name ? ` at ${jobCV.company_name}` : ''}
            </h2>
            {jobCV.ai_changes_summary && (
              <p className="mt-1 text-sm text-blue-800">
                {jobCV.ai_changes_summary}
              </p>
            )}
          </div>
          <button
            type="button"
            className="shrink-0 text-xs font-medium text-blue-700 hover:underline"
            onClick={() => setShowJD(!showJD)}
          >
            {showJD ? 'Hide' : 'View'} Job Description
          </button>
        </div>
        {showJD && (
          <pre className="mt-3 max-h-60 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-3 text-xs text-slate-700">
            {jobCV.job_description}
          </pre>
        )}
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/cv/job-specific"
            className="text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-secondary)]"
          >
            &larr; All Job CVs
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--color-muted)]">
            {isSaving
              ? 'Saving...'
              : lastSaved
                ? `Saved ${lastSaved.toLocaleTimeString()}`
                : ''}
          </span>
          <Link
            href={`/cv/templates?job_cv_id=${id}`}
          >
            <Button variant="primary" size="sm">
              Export PDF
            </Button>
          </Link>
        </div>
      </div>

      {/* Editor */}
      <CVEditorPanel
        value={cvData}
        onChange={handleChange}
        highlightedKeywords={keywords}
      />
    </div>
  );
}
