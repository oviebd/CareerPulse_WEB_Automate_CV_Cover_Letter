'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

type Props = {
  leftSlot?: ReactNode;
  primaryLabel: string;
  primaryLoading?: boolean;
  primaryDisabled?: boolean;
  onPrimaryClick: () => void;
};

export function CVEditorMobileBar({
  leftSlot,
  primaryLabel,
  primaryLoading,
  primaryDisabled,
  onPrimaryClick,
}: Props) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-2 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 p-3 backdrop-blur-md md:hidden">
      {leftSlot ?? <span className="w-0 shrink-0" />}
      <Button
        variant="primary"
        size="sm"
        loading={primaryLoading}
        disabled={primaryDisabled}
        onClick={onPrimaryClick}
      >
        {primaryLabel}
      </Button>
    </div>
  );
}
