'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';

type Props = {
  /** e.g. "this experience entry" */
  itemLabel: string;
  onConfirm: () => void;
  className?: string;
  size?: 'sm' | 'md';
};

export function RemoveEntryButton({ itemLabel, onConfirm, className, size = 'sm' }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size={size}
        className={cn('gap-1.5 text-[var(--color-muted)] hover:text-[var(--color-danger)]', className)}
        onClick={() => setOpen(true)}
        icon={<Trash2 className="h-3.5 w-3.5" aria-hidden />}
        aria-label={`Remove ${itemLabel}`}
      >
        Remove
      </Button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Remove item?">
        <p className="text-sm text-[var(--color-text-secondary)]">
          Remove {itemLabel}? This cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="border-[var(--color-danger)]/40 text-[var(--color-danger)]"
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
          >
            Remove
          </Button>
        </div>
      </Modal>
    </>
  );
}
