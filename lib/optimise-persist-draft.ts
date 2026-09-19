import { useOptimiseDraftStore } from '@/stores/useOptimiseDraftStore';
import type { DraftResult, GenerationType } from '@/types';

export type PersistOptimiseDraftResult = {
  jobId: string | null;
  cvId: string | null;
  coverLetterId: string | null;
};

export function optimiseDraftNeedsPersist(draft: DraftResult): boolean {
  const gen = draft.generationType;
  if (gen === 'cv') return !draft.savedCvId;
  if (gen === 'coverLetter') return !draft.savedCoverLetterId;
  return !draft.savedCvId || !draft.savedCoverLetterId;
}

export function persistScopeForDraft(draft: DraftResult): GenerationType {
  return draft.generationType;
}

/** Persist job-specific CV and/or cover letter from the optimise draft store. */
export async function persistOptimiseDraft(
  scope: GenerationType = 'both'
): Promise<PersistOptimiseDraftResult> {
  const setStoreDraft = useOptimiseDraftStore.getState().setDraft;
  const cur = useOptimiseDraftStore.getState().draft;
  if (!cur) throw new Error('No draft data. Return to optimise and try again.');

  const wantsCv = scope === 'cv' || scope === 'both';
  const wantsCl = scope === 'coverLetter' || scope === 'both';

  if (wantsCv && !wantsCl && cur.savedCvId) {
    return {
      jobId: cur.savedJobId,
      cvId: cur.savedCvId,
      coverLetterId: cur.savedCoverLetterId ?? null,
    };
  }
  if (wantsCl && !wantsCv && cur.savedCoverLetterId) {
    return {
      jobId: cur.savedJobId,
      cvId: cur.savedCvId,
      coverLetterId: cur.savedCoverLetterId,
    };
  }
  if (wantsCv && wantsCl && cur.savedCvId && cur.savedCoverLetterId) {
    return {
      jobId: cur.savedJobId,
      cvId: cur.savedCvId,
      coverLetterId: cur.savedCoverLetterId,
    };
  }

  const needCv = wantsCv && !cur.savedCvId;
  const needCl = wantsCl && !cur.savedCoverLetterId;
  if (!needCv && !needCl) {
    return {
      jobId: cur.savedJobId,
      cvId: cur.savedCvId,
      coverLetterId: cur.savedCoverLetterId ?? null,
    };
  }

  const effectiveGen: GenerationType =
    needCv && needCl ? 'both' : needCv ? 'cv' : 'coverLetter';

  const hasJd = Boolean(cur.jobDescription.trim());
  const cvContent = cur.cv;
  const coverLetterContent = cur.coverLetter;

  let jobId = cur.savedJobId;

  if (hasJd && !jobId) {
    let jobRes: Response;
    try {
      jobRes = await fetch('/api/jobs/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: cur.jobUrl || undefined,
          keywords: cur.analysis?.keywords?.length
            ? cur.analysis.keywords
            : cur.extractedKeywords ?? [],
          jobSummary: cur.analysis?.jobSummary ?? '',
          title: cur.analysis?.jobTitle ?? cur.jobTitle ?? undefined,
          company: cur.analysis?.company ?? cur.companyName ?? undefined,
        }),
      });
    } catch (e) {
      console.error('jobs/save network', e);
      throw new Error('Network error while saving the job. Check your connection.');
    }
    if (!jobRes.ok) {
      const t = await jobRes.text();
      console.error('jobs/save', t);
      throw new Error('Failed to save job.');
    }
    let job: { id: string };
    try {
      job = (await jobRes.json()) as { id: string };
    } catch (e) {
      console.error('jobs/save JSON parse', e);
      throw new Error('Invalid response after saving job.');
    }
    if (!job?.id) {
      throw new Error('Job was saved but no id was returned.');
    }
    jobId = job.id;
  }

  let res: Response;
  try {
    res = await fetch('/api/cvs/save-optimised', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cvContent: needCv ? cvContent : undefined,
        coverLetterContent: needCl ? coverLetterContent : undefined,
        originalCvId: cur.originalCvId,
        jobId: jobId ?? null,
        generationType: effectiveGen,
        ai_changes_summary: cur.aiChangesSummary ?? null,
        keywords_added: cur.extractedKeywords ?? [],
        bullets_improved: cur.bulletsImproved ?? 0,
        coverLetterTone: cur.coverLetterTone,
        coverLetterLength: cur.coverLetterLength,
        coverLetterEmphasis: cur.coverLetterEmphasis,
      }),
    });
  } catch (e) {
    console.error('save-optimised network', e);
    throw new Error('Network error while saving your CV or cover letter.');
  }
  if (!res.ok) {
    const t = await res.text();
    console.error('save-optimised', t);
    const label =
      effectiveGen === 'cv'
        ? 'Failed to save CV.'
        : effectiveGen === 'coverLetter'
          ? 'Failed to save cover letter.'
          : 'Failed to save CV and cover letter.';
    throw new Error(label);
  }
  let out: { cvId: string | null; coverLetterId: string | null };
  try {
    out = (await res.json()) as {
      cvId: string | null;
      coverLetterId: string | null;
    };
  } catch (e) {
    console.error('save-optimised JSON parse', e);
    throw new Error('Invalid response after saving documents.');
  }

  const next: DraftResult = {
    ...cur,
    savedJobId: jobId ?? null,
    savedCvId: out.cvId ?? cur.savedCvId,
    savedCoverLetterId: out.coverLetterId ?? cur.savedCoverLetterId ?? null,
    isTracked: cur.isTracked,
  };
  setStoreDraft(next);
  return {
    jobId: next.savedJobId,
    cvId: next.savedCvId,
    coverLetterId: next.savedCoverLetterId ?? null,
  };
}
