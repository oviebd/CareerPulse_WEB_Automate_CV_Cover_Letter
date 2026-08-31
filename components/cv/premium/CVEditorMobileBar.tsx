'use client';

import type { ReactNode } from 'react';
import { Eye, LayoutList } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  leftSlot?: ReactNode;
  primaryLabel: string;
  primaryLoading?: boolean;
  primaryDisabled?: boolean;
  onPrimaryClick: () => void;
  onSectionsClick?: () => void;
  onPreviewClick?: () => void;
  previewActive?: boolean;
};

export function CVEditorMobileBar({
  leftSlot,
  primaryLabel,
  primaryLoading,
  primaryDisabled,
  onPrimaryClick,
  onSectionsClick,
  onPreviewClick,
  previewActive,
}: Props) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-2 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 p-3 backdrop-blur-md md:hidden">
      <div className="flex min-w-0 items-center gap-1.5">
        {onSectionsClick ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-9 px-2.5"
            onClick={onSectionsClick}
            icon={<LayoutList className="h-4 w-4" />}
          >
            Sections
          </Button>
        ) : (
          leftSlot ?? <span className="w-0 shrink-0" />
        )}
        {onPreviewClick ? (
          <Button
            type="button"
            variant={previewActive ? 'primary' : 'secondary'}
            size="sm"
            className="h-9 px-2.5"
            onClick={onPreviewClick}
            icon={<Eye className="h-4 w-4" />}
          >
            Preview
          </Button>
        ) : null}
      </div>
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
