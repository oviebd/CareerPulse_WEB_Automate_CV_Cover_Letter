'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { CVEditorPanel } from '@/components/cv/CVEditorPanel';
import { useSubscription } from '@/hooks/useSubscription';
import { useSaveJobSpecificCV } from '@/hooks/useJobSpecificCVs';
import { useCoreCVVersions } from '@/hooks/useCV';
import type { CVData } from '@/types';
import { formatDate } from '@/lib/utils';

interface OptimiseResult {
  optimised_cv: CVData;
  ai_changes_summary: string;
  keywords_added: string[];
  bullets_improved: number;
  warnings?: string[];
}

export default function CVOptimisePage() {
  const { tier } = useSubscription();
  const { toast } = useToast();
  const saveJobCV = useSaveJobSpecificCV();
  const { data: coreVersions = [], isLoading: coreVersionsLoading } = useCoreCVVersions();

  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<OptimiseResult | null>(null);
  const [editedCV, setEditedCV] = useState<CVData | null>(null);
  const [showCoreModal, setShowCoreModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [coreUpdateStatus, setCoreUpdateStatus] = useState<'idle' | 'saving'>('idle');
  const [savedId, setSavedId] = useState<string | null>(null);
  const [baseCoreCvId, setBaseCoreCvId] = useState<string | null>(null);

  const isFree = tier === 'free';
  const jdLength = jobDescription.trim().length;
  const canSubmit =
    jobTitle.trim().length > 0 && jdLength >= 100 && !isFree && !!baseCoreCvId;

  useEffect(() => {
    if (!coreVersionsLoading && baseCoreCvId == null && coreVersions.length > 0) {
      setBaseCoreCvId(coreVersions[0].id);
    }
  }, [coreVersionsLoading, coreVersions, baseCoreCvId]);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setResult(null);
    setEditedCV(null);
    setSaveStatus('idle');
    setSavedId(null);
    try {
      const res = await fetch('/api/cv/optimise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_title: jobTitle.trim(),
          company_name: companyName.trim() || null,
          job_description: jobDescription.trim(),
          core_cv_id: baseCoreCvId,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast(err.error || 'Generation failed', 'error');
        return;
      }
      const data = (await res.json()) as OptimiseResult;
      setResult(data);
      setEditedCV(data.optimised_cv);
      if (data.warnings?.length) {
        data.warnings.forEach((w) => toast(w, 'info'));
      }
    } catch {
      toast('Something went wrong. Please try again.', 'error');
    } finally {
      setIsGenerating(false);
    }
  }, [jobTitle, companyName, jobDescription, toast]);

  const handleSaveAsJobCV = useCallback(async () => {
    if (!editedCV || !result) return;
    setSaveStatus('saving');
    try {
      const { id } = await saveJobCV.mutateAsync({
        job_title: jobTitle.trim(),
        company_name: companyName.trim() || null,
        job_description: jobDescription.trim(),
        cv_data: editedCV as unknown as Record<string, unknown>,
        ai_changes_summary: result.ai_changes_summary,
        keywords_added: result.keywords_added,
        bullets_improved: result.bullets_improved,
      });
      setSavedId(id);
      setSaveStatus('saved');
      toast('Job CV saved successfully!', 'success');
    } catch {
      setSaveStatus('idle');
      toast('Failed to save. Please try again.', 'error');
    }
  }, [editedCV, result, jobTitle, companyName, jobDescription, saveJobCV, toast]);

  const handleUpdateCore = useCallback(async () => {
    if (!editedCV) return;
    setCoreUpdateStatus('saving');
    setShowCoreModal(false);
    try {
      const res = await fetch('/api/cv', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: editedCV.full_name,
          professional_title: editedCV.professional_title,
          email: editedCV.email,
          phone: editedCV.phone,
          location: editedCV.location,
          linkedin_url: editedCV.linkedin_url,
          portfolio_url: editedCV.portfolio_url,
          website_url: editedCV.website_url,
          address: editedCV.address,
          photo_url: editedCV.photo_url || null,
          summary: editedCV.summary,
          // Ensure we never persist uploaded PDFs; we only keep extracted info.
          original_cv_file_url: null,
          experience: editedCV.experience,
          education: editedCV.education,
          skills: editedCV.skills,
          projects: editedCV.projects,
          languages: editedCV.languages,
          certifications: editedCV.certifications,
          awards: editedCV.awards,
          referrals: (editedCV.referrals ?? []).slice(0, 2),
        }),
      });
      if (res.ok) {
        toast('Core CV profile updated!', 'success');
      } else {
        toast('Failed to update core profile.', 'error');
      }
    } catch {
      toast('Failed to update. Please try again.', 'error');
    } finally {
      setCoreUpdateStatus('idle');
    }
  }, [editedCV, toast]);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left panel — Input */}
        <div className="w-full shrink-0 lg:w-[45%]">
          <div className="sticky top-6 space-y-5">
            <div>
              <h1 className="font-display text-2xl font-bold">Optimise CV for a job</h1>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                Paste the job description below. AI will tailor your CV to match
                — using only your real experience.
              </p>
            </div>

            {isFree ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                  <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m0 0v2m0-2h2m-2 0H10m9.364-7.364A9 9 0 115.636 5.636 9 9 0 0119.364 12.636z" />
                  </svg>
                </div>
                <p className="font-semibold text-amber-900">
                  This feature requires a Pro plan or above
                </p>
                <Link
                  href="/settings/billing"
                  className="mt-3 inline-flex rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-[var(--color-primary-hover)]"
                >
                  Upgrade to Pro &rarr;
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <Select
                  label={coreVersionsLoading ? 'Loading…' : 'Base core CV'}
                  value={baseCoreCvId ?? ''}
                  disabled={coreVersionsLoading || coreVersions.length === 0}
                  options={coreVersions.map((v) => ({
                    value: v.id,
                    label: `${v.full_name ?? 'Core CV'} · ${formatDate(v.created_at)}`,
                  }))}
                  onChange={(e) => setBaseCoreCvId(e.target.value)}
                />
                <Input
                  label="Job Title"
                  placeholder="e.g. Senior Product Manager"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                />
                <Input
                  label="Company Name"
                  placeholder="e.g. Figma (optional)"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
                <div>
                  <Textarea
                    label="Job Description"
                    placeholder="Paste the full job description here. The more complete, the better the match..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    className="min-h-[280px]"
                  />
                  <p
                    className={`mt-1 text-xs ${
                      jdLength > 0 && jdLength < 100
                        ? 'text-red-500'
                        : 'text-[var(--color-muted)]'
                    }`}
                  >
                    {jdLength} / 100 characters minimum
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={!canSubmit}
                  loading={isGenerating}
                  onClick={() => void handleGenerate()}
                >
                  {isGenerating ? 'Analysing your CV...' : 'Tailor My CV'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Right panel — Output */}
        <div className="w-full lg:w-[55%]">
          {!result && !isGenerating && (
            <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--color-border)] p-8 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="font-display text-lg font-semibold text-[var(--color-secondary)]">
                Your tailored CV will appear here
              </h3>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                Fill in the job details on the left and click Tailor My CV
              </p>
            </div>
          )}

          {isGenerating && (
            <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-[var(--color-border)] p-8 text-center">
              <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent" />
              <p className="font-semibold text-[var(--color-secondary)]">
                Analysing your CV and the job description...
              </p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                This may take 15-30 seconds
              </p>
            </div>
          )}

          {result && editedCV && (
            <div className="space-y-4">
              {/* AI Changes Banner */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <h3 className="font-semibold text-emerald-900">
                  CV tailored for {jobTitle}
                  {companyName ? ` at ${companyName}` : ''}
                </h3>
                <p className="mt-1 text-sm text-emerald-800">
                  {result.ai_changes_summary}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {result.keywords_added.map((kw) => (
                    <span
                      key={kw}
                      className="rounded-full bg-emerald-200 px-2 py-0.5 text-xs font-medium text-emerald-900"
                    >
                      {kw}
                    </span>
                  ))}
                  {result.bullets_improved > 0 && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                      {result.bullets_improved} bullet{result.bullets_improved !== 1 ? 's' : ''} improved
                    </span>
                  )}
                </div>
              </div>

              {/* Inline CV Editor */}
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <CVEditorPanel
                  value={editedCV}
                  onChange={setEditedCV}
                  highlightedKeywords={result.keywords_added}
                />
              </div>

              {/* Save Action Bar */}
              <div className="sticky bottom-0 z-10 flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between">
                <Button
                  variant="secondary"
                  onClick={() => setShowCoreModal(true)}
                  loading={coreUpdateStatus === 'saving'}
                  title="Overwrite your main CV with these changes"
                >
                  Update Core Profile
                </Button>
                <div className="flex items-center gap-2">
                  {saveStatus === 'saved' && savedId ? (
                    <div className="flex items-center gap-2">
                      <Button variant="primary" disabled>
                        Saved ✓
                      </Button>
                      <Link
                        href="/cv/job-specific"
                        className="text-sm font-semibold text-[var(--color-primary)] hover:underline"
                      >
                        View in Job CVs &rarr;
                      </Link>
                    </div>
                  ) : (
                    <Button
                      variant="primary"
                      onClick={() => void handleSaveAsJobCV()}
                      loading={saveStatus === 'saving'}
                      title="Save this as a separate CV for this specific job"
                    >
                      Save as Job CV
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation modal for Update Core Profile */}
      <Modal
        isOpen={showCoreModal}
        onClose={() => setShowCoreModal(false)}
        title="Update your core CV?"
      >
        <p className="text-sm text-[var(--color-secondary)]">
          This will overwrite your main CV profile with the tailored version.
          Your original information will be replaced.
        </p>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Consider saving as a Job CV instead to keep your original CV intact.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            onClick={() => {
              setShowCoreModal(false);
              void handleSaveAsJobCV();
            }}
          >
            Save as Job CV instead
          </Button>
          <Button
            variant="danger"
            onClick={() => void handleUpdateCore()}
          >
            Yes, Update Core Profile
          </Button>
        </div>
      </Modal>
    </div>
  );
}
