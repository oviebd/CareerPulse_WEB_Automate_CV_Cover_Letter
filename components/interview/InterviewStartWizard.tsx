'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { InterviewCVSelector } from '@/components/interview/InterviewCVSelector';
import { Step2JobDetails } from '@/components/cv/optimise/Step2JobDetails';
import { useAllCVVersions } from '@/hooks/useCV';
import { useStartInterview, type StartInterviewBody } from '@/hooks/useInterview';
import { ApiError } from '@/lib/api-fetch';
import { AiWorkingOverlay } from '@/components/shared/AiWorkingOverlay';
import { cn } from '@/lib/utils';

const STAGE_OPTIONS = [
  { value: '', label: 'Not specified' },
  { value: 'phone', label: 'Phone screen' },
  { value: 'technical', label: 'Technical' },
  { value: 'behavioral', label: 'Behavioral' },
  { value: 'panel', label: 'Panel' },
  { value: 'final', label: 'Final' },
  { value: 'assessment', label: 'Assessment / case study' },
];

type StepId = 1 | 2 | 3;

function interviewErrorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === 'CV_NOT_FOUND') {
      return 'Create a CV in Documents before starting interview preparation.';
    }
    if (e.code === 'JOB_CONTEXT_INSUFFICIENT') {
      return e.message;
    }
    if (e.code === 'UPGRADE_REQUIRED') {
      return 'Interview preparation requires a Pro plan.';
    }
    return e.message;
  }
  return 'Could not start interview preparation. Please try again.';
}

export function InterviewStartWizard() {
  const router = useRouter();
  const { toast } = useToast();
  const start = useStartInterview();
  const { data: cvOptions = [], isLoading: cvsLoading } = useAllCVVersions();

  const [step, setStep] = useState<StepId>(1);
  const [selectedCV, setSelectedCV] = useState<string | null>(null);
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewStage, setInterviewStage] = useState('');
  const [extraNotes, setExtraNotes] = useState('');

  useEffect(() => {
    if (!cvsLoading && selectedCV == null && cvOptions.length > 0) {
      setSelectedCV(cvOptions[0].id);
    }
  }, [cvsLoading, cvOptions, selectedCV]);

  const jdLength = jobDescription.trim().length;
  const canStep2 = Boolean(selectedCV);
  const canStep3 = jobTitle.trim().length > 0 && companyName.trim().length > 0 && jdLength >= 100;
  const maxStep = useMemo<StepId>(() => {
    if (!canStep2) return 1;
    if (!canStep3) return 2;
    return 3;
  }, [canStep2, canStep3]);

  const goToStep = useCallback(
    (target: StepId) => {
      if (target <= maxStep) setStep(target);
    },
    [maxStep]
  );

  async function handleSubmit() {
    if (!selectedCV || !canStep3) return;
    const body: StartInterviewBody = {
      job_title: jobTitle.trim(),
      company_name: companyName.trim(),
      job_description: jobDescription.trim(),
      cv_id: selectedCV,
      job_url: jobUrl.trim() || undefined,
      interview_date: interviewDate || undefined,
      interview_stage: interviewStage || undefined,
      extra_context: extraNotes.trim() || undefined,
    };

    try {
      const result = await start.mutateAsync(body);
      const profileId = result.profile?.id;
      if (profileId) {
        toast('Interview preparation started.', 'success');
        router.push(`/interview/${profileId}`);
      }
    } catch (e) {
      toast(interviewErrorMessage(e), 'error');
    }
  }

  return (
    <div className="space-y-6">
      <AiWorkingOverlay
        open={start.isPending}
        title="Finding topics to practice"
        messages={[
          'Reading the job and your CV…',
          'AI is building your prep topic list…',
          'Organizing focus areas for you…',
        ]}
      />
      <nav className="flex gap-2">
        {([1, 2, 3] as StepId[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => goToStep(id)}
            disabled={id > maxStep}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              step === id
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-surface-2)] text-[var(--color-muted)]',
              id > maxStep && 'cursor-not-allowed opacity-50'
            )}
          >
            Step {id}
          </button>
        ))}
      </nav>

      {step === 1 ? (
        <InterviewCVSelector
          options={cvOptions}
          loading={cvsLoading}
          selectedCvId={selectedCV}
          onSelect={setSelectedCV}
        />
      ) : null}

      {step === 2 ? (
        <Step2JobDetails
          jobTitle={jobTitle}
          companyName={companyName}
          jobDescription={jobDescription}
          jobUrl={jobUrl}
          onJobTitleChange={setJobTitle}
          onCompanyNameChange={setCompanyName}
          onJobDescriptionChange={setJobDescription}
          onJobUrlChange={setJobUrl}
        />
      ) : null}

      {step === 3 ? (
        <section className="space-y-5">
          <header className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
              Step 3
            </p>
            <h2 className="font-display text-2xl font-semibold text-[var(--color-text-primary)]">
              Interview context
            </h2>
            <p className="text-sm text-[var(--color-muted)]">
              Optional details to personalize your preparation plan.
            </p>
          </header>
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
            label="Extra notes (optional)"
            value={extraNotes}
            onChange={(e) => setExtraNotes(e.target.value)}
            rows={4}
            placeholder="Focus areas, company research, interviewer background…"
          />
        </section>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-4">
        {step > 1 ? (
          <Button type="button" variant="secondary" onClick={() => setStep((step - 1) as StepId)}>
            Back
          </Button>
        ) : (
          <Link
            href="/interview"
            className="text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-text-primary)]"
          >
            ← Back to interview prep
          </Link>
        )}

        {step < 3 ? (
          <Button
            type="button"
            variant="primary"
            disabled={(step === 1 && !canStep2) || (step === 2 && !canStep3)}
            onClick={() => setStep((step + 1) as StepId)}
          >
            Continue
          </Button>
        ) : (
          <Button
            type="button"
            variant="primary"
            loading={start.isPending}
            disabled={!canStep3}
            onClick={() => void handleSubmit()}
          >
            {start.isPending ? 'Finding topics…' : 'Start preparation'}
          </Button>
        )}
      </div>
    </div>
  );
}
