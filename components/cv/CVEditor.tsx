'use client';

import { useEffect, useState } from 'react';
import { useCVProfile } from '@/hooks/useCV';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs } from '@/components/ui/tabs';
import type { ExperienceEntry } from '@/types';
import { generateId } from '@/lib/utils';

export function CVEditor() {
  const { data: cv, isLoading, refetch } = useCVProfile();
  const [tab, setTab] = useState('header');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

  const [full_name, setFullName] = useState('');
  const [professional_title, setTitle] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [linkedin_url, setLi] = useState('');
  const [summary, setSummary] = useState('');
  const [experience, setExperience] = useState<ExperienceEntry[]>([]);

  useEffect(() => {
    if (!cv) return;
    setFullName(cv.full_name ?? '');
    setTitle(cv.professional_title ?? '');
    setEmail(cv.email ?? '');
    setPhone(cv.phone ?? '');
    setLocation(cv.location ?? '');
    setLi(cv.linkedin_url ?? '');
    setSummary(cv.summary ?? '');
    setExperience(
      (cv.experience?.length ? cv.experience : []) as ExperienceEntry[]
    );
  }, [cv]);

  async function save() {
    setSaveState('saving');
    const res = await fetch('/api/cv', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name,
        professional_title,
        email,
        phone,
        location,
        linkedin_url,
        summary,
        experience,
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

  if (isLoading) {
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
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'header', label: 'Header & contact' },
          { id: 'summary', label: 'Summary' },
          { id: 'experience', label: 'Experience' },
        ]}
      />
      <div className="pt-4">
        {tab === 'header' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Full name" value={full_name} onChange={(e) => setFullName(e.target.value)} />
            <Input label="Professional title" value={professional_title} onChange={(e) => setTitle(e.target.value)} />
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Input label="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
            <Input label="LinkedIn URL" value={linkedin_url} onChange={(e) => setLi(e.target.value)} />
          </div>
        ) : null}
        {tab === 'summary' ? (
          <Textarea
            label="Summary"
            maxLength={500}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
        ) : null}
        {tab === 'experience' ? (
          <div className="space-y-4">
            {experience.map((ex, i) => (
              <div key={ex.id} className="rounded-lg border border-[var(--color-border)] p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label="Title"
                    value={ex.title}
                    onChange={(e) => {
                      const n = [...experience];
                      n[i] = { ...ex, title: e.target.value };
                      setExperience(n);
                    }}
                  />
                  <Input
                    label="Company"
                    value={ex.company}
                    onChange={(e) => {
                      const n = [...experience];
                      n[i] = { ...ex, company: e.target.value };
                      setExperience(n);
                    }}
                  />
                </div>
                <Textarea
                  className="mt-3"
                  label="Bullets (one per line)"
                  value={ex.bullets.join('\n')}
                  onChange={(e) => {
                    const n = [...experience];
                    n[i] = {
                      ...ex,
                      bullets: e.target.value.split('\n').filter(Boolean).slice(0, 8),
                    };
                    setExperience(n);
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => setExperience(experience.filter((_, j) => j !== i))}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              variant="secondary"
              onClick={() =>
                setExperience([
                  ...experience,
                  {
                    id: generateId(),
                    company: '',
                    title: '',
                    location: '',
                    start_date: '',
                    end_date: null,
                    is_current: false,
                    bullets: [],
                    description: null,
                  },
                ])
              }
            >
              Add experience
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
