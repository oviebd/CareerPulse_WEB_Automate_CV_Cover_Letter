'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useAllCVVersions } from '@/hooks/useCV';
import { formatDate } from '@/lib/utils';
import type { EligibleInterviewJob } from '@/types/interview';

const STAGE_OPTIONS = [
  { value: '', label: 'Not specified' },
  { value: 'phone', label: 'Phone screen' },
  { value: 'technical', label: 'Technical' },
  { value: 'behavioral', label: 'Behavioral' },
  { value: 'panel', label: 'Panel' },
  { value: 'final', label: 'Final' },
  { value: 'assessment', label: 'Assessment / case study' },
];

type PrepareJobModalProps = {
  job: EligibleInterviewJob | null;
  isOpen: boolean;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    job_id: string;
    cv_id?: string;
    job_description?: string;
    interview_date?: string;
    interview_stage?: string;
    extra_context?: string;
  }) => void;
};

export function PrepareJobModal({
  job,
  isOpen,
  loading,
  onClose,
  onSubmit,
}: PrepareJobModalProps) {
  const { data: cvOptions = [], isLoading: cvsLoading } = useAllCVVersions();
  const [selectedCvId, setSelectedCvId] = useState<string>('');
  const [jobDescription, setJobDescription] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewStage, setInterviewStage] = useState('');
  const [extraNotes, setExtraNotes] = useState('');

  useEffect(() => {
    if (!job || cvsLoading) return;
    if (cvOptions.length === 0) {
      setSelectedCvId('');
      return;
    }
    const preferred =
      (job.linked_cv_id && cvOptions.some((cv) => cv.id === job.linked_cv_id)
        ? job.linked_cv_id
        : cvOptions[0].id) ?? cvOptions[0].id;
    setSelectedCvId(preferred);
  }, [job, cvsLoading, cvOptions]);

  const needsJd = job?.needs_job_context ?? false;
  const jdLength = jobDescription.trim().length;
  const hasCv = cvOptions.length > 0;
  const canSubmit = hasCv && (!needsJd || jdLength >= 100);

  function handleClose() {
    setSelectedCvId('');
    setJobDescription('');
    setInterviewDate('');
    setInterviewStage('');
    setExtraNotes('');
    onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!job || !canSubmit || !selectedCvId) return;
    onSubmit({
      job_id: job.id,
      cv_id: selectedCvId,
      job_description: needsJd || jdLength >= 100 ? jobDescription.trim() : undefined,
      interview_date: interviewDate || undefined,
      interview_stage: interviewStage || undefined,
      extra_context: extraNotes.trim() || undefined,
    });
  }

  if (!job) return null;

  const cvSelectOptions =
    cvOptions.length > 0
      ? cvOptions.map((cv) => ({
          value: cv.id,
          label: `${cv.name || 'Untitled CV'} · ${cv.kind === 'job-specific' ? 'Job-specific' : 'General'} · Updated ${formatDate(cv.updated_at)}`,
        }))
      : [{ value: '', label: 'No CV found', disabled: true }];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Prepare for ${job.job_title}`}
      className="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-[var(--color-muted)]">
          {job.company_name}
          {needsJd
            ? ' — paste the job description so we can tailor your interview prep.'
            : ' — add optional interview details or extra context.'}
        </p>

        {!cvsLoading && !hasCv ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-center">
            <p className="font-medium text-[var(--color-text-primary)]">You need a CV first</p>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Go to Documents to upload or create a CV before starting interview preparation.
            </p>
            <Link
              href="/documents"
              className="mt-3 inline-flex items-center rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Go to Documents
            </Link>
          </div>
        ) : (
          <Select
            label={cvsLoading ? 'Loading CVs…' : 'CV for interview prep'}
            value={selectedCvId}
            onChange={(e) => setSelectedCvId(e.target.value)}
            disabled={cvsLoading || !hasCv}
            options={cvSelectOptions}
          />
        )}

        {needsJd ? (
          <div>
            <label
              htmlFor="prepare-jd"
              className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]"
            >
              Job description
            </label>
            <Textarea
              id="prepare-jd"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={8}
              placeholder="Paste the full job description…"
            />
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              {jdLength} characters {jdLength < 100 ? '(minimum 100)' : ''}
            </p>
          </div>
        ) : null}

        <Input
          label="Interview date (optional)"
          type="date"
          value={interviewDate}
          onChange={(e) => setInterviewDate(e.target.value)}
        />

        <Select
          label="Interview stage (optional)"
          value={interviewStage}
          onChange={(e) => setInterviewStage(e.target.value)}
          options={STAGE_OPTIONS}
        />

        <Textarea
          label="Extra context (optional)"
          value={extraNotes}
          onChange={(e) => setExtraNotes(e.target.value)}
          rows={3}
          placeholder="Focus areas, interviewer names, company research notes…"
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading} disabled={!canSubmit}>
            Start preparation
          </Button>
        </div>
      </form>
    </Modal>
  );
}
