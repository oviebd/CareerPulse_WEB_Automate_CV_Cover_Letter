'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, FileDown, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExportFormat } from '@/lib/export-client';

export interface ExportMenuProps {
  /** Current export in flight ('pdf' | 'docx' | null) for the loading state. */
  busyFormat: ExportFormat | null;
  disabled?: boolean;
  /** Free tier sees the DOCX option but gets an upgrade toast on click. */
  canDocx: boolean;
  onExport: (format: ExportFormat) => void;
  label?: string;
  size?: 'sm' | 'md';
  /** Stretch trigger to container width (e.g. preview footer). */
  fullWidth?: boolean;
}

/**
 * Dropdown with PDF / DOCX options so every export surface offers both
 * formats from one control. DOCX shows a Pro badge when locked.
 */
export function ExportMenu({
  busyFormat,
  disabled,
  canDocx,
  onExport,
  label = 'Export',
  size = 'sm',
  fullWidth = false,
}: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const el = menuRef.current;
      const target = e.target as Node | null;
      if (el && target && !el.contains(target)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
    };
  }, [open]);

  const busy = busyFormat !== null;

  const items: { format: ExportFormat; label: string; icon: typeof FileDown }[] = [
    { format: 'pdf', label: 'PDF', icon: FileDown },
    { format: 'docx', label: 'Google Docs (Word)', icon: FileText },
  ];

  return (
    <div ref={menuRef} className={cn('relative inline-flex', fullWidth && 'w-full')}>
      <button
        type="button"
        disabled={disabled || busy}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`${label} — PDF or Google Docs`}
        title={`${label} — PDF or Google Docs`}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-control-bg)] font-semibold text-[var(--color-text-primary)] transition',
          'hover:bg-[var(--color-control-bg-hover)] hover:border-[var(--color-border-hover)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          size === 'sm' ? 'h-9 px-3 text-sm' : 'h-10 px-4 text-sm',
          fullWidth && 'w-full'
        )}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileDown className="h-4 w-4" />
        )}
        {busy ? 'Exporting…' : label}
        {!busy ? <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden /> : null}
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-[90] mt-2 min-w-[230px] overflow-hidden rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-surface)] py-1 shadow-lg"
        >
          {items.map(({ format, label: itemLabel, icon: Icon }) => (
            <button
              key={format}
              type="button"
              role="menuitem"
              disabled={disabled || busy}
              onClick={() => {
                setOpen(false);
                onExport(format);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--color-text-primary)] transition hover:bg-[var(--color-hover-surface)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{itemLabel}</span>
              {format === 'docx' && !canDocx ? (
                <span className="rounded-full bg-[var(--color-accent-gold)]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-accent-gold)]">
                  Pro
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
