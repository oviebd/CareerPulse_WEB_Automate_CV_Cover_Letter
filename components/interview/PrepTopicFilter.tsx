'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PREP_TOPIC_ALL } from '@/lib/interview/prep-topic-query';

export type PrepTopicOption = {
  id: string;
  name: string;
};

type Props = {
  topics: PrepTopicOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function PrepTopicFilter({ topics, value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const options = [
    { value: PREP_TOPIC_ALL, label: 'All topics' },
    ...topics.map((t) => ({ value: t.id, label: t.name })),
  ];
  const selected = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [value]);

  function pick(next: string) {
    onChange(next);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className="relative w-full max-w-md">
      <label
        htmlFor="prep-topic-trigger"
        className="mb-1 block text-sm font-medium text-[var(--color-text-primary)]"
      >
        Topic
      </label>
      <button
        id="prep-topic-trigger"
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex w-full items-center justify-between gap-3 rounded-btn border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2.5 text-left text-sm text-[var(--color-text-primary)] outline-none transition duration-150',
          'focus:border-[var(--color-primary-500)] focus:shadow-[0_0_0_3px_rgba(108,99,255,0.2)]',
          disabled && 'cursor-not-allowed opacity-60'
        )}
      >
        <span className="min-w-0 truncate font-medium">{selected?.label ?? 'All topics'}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-[var(--color-muted)] transition-transform duration-150',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && !disabled ? (
        <ul
          role="listbox"
          aria-label="Topic"
          className="absolute left-0 top-[calc(100%+4px)] z-50 max-h-72 w-full overflow-y-auto rounded-btn border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-lg"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <li key={option.value} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => pick(option.value)}
                  className={cn(
                    'flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm leading-snug text-[var(--color-text-primary)] transition hover:bg-[var(--color-hover-surface)]',
                    isSelected && 'bg-[var(--color-primary-50)] text-[var(--color-primary)]'
                  )}
                >
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                    {isSelected ? <Check className="h-4 w-4" /> : null}
                  </span>
                  <span className="min-w-0 flex-1">{option.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
