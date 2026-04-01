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
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)]/80 p-4 backdrop-blur-sm">
      <p className="text-sm font-semibold text-[var(--color-text-primary)]">
        Sections included in your CV
      </p>
      <p className="mt-1 text-xs text-[var(--color-muted)]">
        Uncheck to hide a section from PDF export and preview. You can still edit hidden sections here.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {ROWS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={`rounded-badge border px-3 py-1.5 text-xs font-medium transition duration-200 ${
              isOn(key)
                ? 'border-[var(--color-primary-400)]/50 bg-[var(--color-primary-100)] text-[var(--color-primary-400)] shadow-[0_0_0_1px_rgba(108,99,255,0.2)]'
                : 'border-[var(--color-border)] bg-white/[0.04] text-[var(--color-muted)] hover:bg-white/[0.08] hover:text-[var(--color-text-primary)]'
            }`}
            onClick={() => toggle(key, !isOn(key))}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
