'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useCVProfile } from '@/hooks/useCV';
import { Button } from '@/components/ui/button';
import { CVEditorPanel } from '@/components/cv/CVEditorPanel';
import type { CVData } from '@/types';

export function CVEditor() {
  const { data: cv, isLoading, refetch } = useCVProfile();
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [cvData, setCvData] = useState<CVData | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!cv || initialized.current) return;
    initialized.current = true;
    setCvData({
      full_name: cv.full_name ?? null,
      professional_title: cv.professional_title ?? null,
      email: cv.email ?? null,
      phone: cv.phone ?? null,
      location: cv.location ?? null,
      linkedin_url: cv.linkedin_url ?? null,
      portfolio_url: cv.portfolio_url ?? null,
      website_url: cv.website_url ?? null,
      address: cv.address ?? null,
      photo_url: cv.photo_url ?? null,
      summary: cv.summary ?? null,
      experience: cv.experience ?? [],
      education: cv.education ?? [],
      skills: cv.skills ?? [],
      projects: cv.projects ?? [],
      certifications: cv.certifications ?? [],
      languages: cv.languages ?? [],
      awards: cv.awards ?? [],
      referrals: cv.referrals ?? [],
    });
  }, [cv]);

  const handleChange = useCallback((data: CVData) => {
    setCvData(data);
  }, []);

  async function save() {
    if (!cvData) return;
    setSaveState('saving');
    const res = await fetch('/api/cv', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: cvData.full_name,
        professional_title: cvData.professional_title,
        email: cvData.email,
        phone: cvData.phone,
        location: cvData.location,
        linkedin_url: cvData.linkedin_url,
        portfolio_url: cvData.portfolio_url,
        website_url: cvData.website_url,
        address: cvData.address,
        photo_url: cvData.photo_url || null,
        summary: cvData.summary,
        section_visibility: {},
        experience: cvData.experience,
        education: cvData.education,
        skills: cvData.skills,
        projects: cvData.projects,
        languages: cvData.languages,
        certifications: cvData.certifications,
        referrals: (cvData.referrals ?? []).slice(0, 2),
        awards: cvData.awards,
      }),
    });
    if (res.ok) {
      setSaveState('saved');
      void refetch();
      setTimeout(() => setSaveState('idle'), 2000);
    } else {
      setSaveState('idle');
    }
  }

  if (isLoading || !cvData) {
    return <p className="text-sm text-[var(--color-muted)]">Loading profile…</p>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Edit CV</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--color-muted)]">
            {cv ? (
              <>
                Completion: <strong>{cv.completion_percentage}%</strong>
              </>
            ) : (
              'New profile'
            )}
          </span>
          <Button variant="primary" size="sm" loading={saveState === 'saving'} onClick={() => void save()}>
            Save
          </Button>
          <span className="text-xs text-[var(--color-muted)]">
            {saveState === 'saved' ? '✓ Saved' : ''}
          </span>
        </div>
      </div>
      <CVEditorPanel value={cvData} onChange={handleChange} />
    </div>
  );
}
