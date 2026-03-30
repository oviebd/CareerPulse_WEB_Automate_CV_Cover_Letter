'use client';

import type { CVSectionVisibility, CVSectionVisibilityKey } from '@/types';

const ROWS: { key: CVSectionVisibilityKey; label: string }[] = [
  { key: 'photo', label: 'Photo' },
  { key: 'address', label: 'Address' },
  { key: 'summary', label: 'Summary' },
  { key: 'experience', label: 'Experience' },
  { key: 'education', label: 'Education' },
  { key: 'skills', label: 'Skills' },
  { key: 'projects', label: 'Projects' },
  { key: 'languages', label: 'Languages' },
  { key: 'certifications', label: 'Certifications' },
  { key: 'awards', label: 'Awards' },
  { key: 'referrals', label: 'References' },
];

type Props = {
  visibility: CVSectionVisibility | undefined;
  onChange: (next: CVSectionVisibility) => void;
};

export function CVSectionVisibilityPanel({ visibility, onChange }: Props) {
  function toggle(key: CVSectionVisibilityKey, checked: boolean) {
    const next = { ...visibility };
    if (checked) {
      delete next[key];
    } else {
      next[key] = false;
    }
    onChange(next);
  }

  function isOn(key: CVSectionVisibilityKey): boolean {
    return visibility?.[key] !== false;
  }

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-slate-50/80 p-4">
      <p className="text-sm font-semibold text-[var(--color-secondary)]">
        Sections included in your CV
      </p>
      <p className="mt-1 text-xs text-[var(--color-muted)]">
        Uncheck to hide a section from PDF export and preview. You can still edit hidden sections here.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {ROWS.map(({ key, label }) => (
          <label
            key={key}
            className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-secondary)]"
          >
            <input
              type="checkbox"
              className="rounded border-[var(--color-border)]"
              checked={isOn(key)}
              onChange={(e) => toggle(key, e.target.checked)}
            />
            {label}
          </label>
        ))}
      </div>
    </div>
  );
}
