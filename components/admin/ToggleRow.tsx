'use client';

import { cn } from '@/lib/utils';

export function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-[var(--color-border)] px-4 py-3 transition-colors',
        disabled ? 'opacity-60' : 'hover:bg-[var(--color-hover-surface)]'
      )}
    >
      <div>
        <p className="text-sm font-medium text-[var(--color-text-primary)]">{label}</p>
        {description ? (
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{description}</p>
        ) : null}
      </div>
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 accent-[var(--color-primary)]"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}
