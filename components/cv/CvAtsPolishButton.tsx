'use client';

import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

type Props = {
  onClick: () => void;
  /** When set (e.g. guest), called instead of opening the AI flow. */
  onAuthRequired?: () => void;
  disabled?: boolean;
  className?: string;
};

const HINT = 'Improves wording. Does not invent jobs or dates.';

/** Opens AI rewrite modal for the current field. */
export function CvAtsPolishButton({ onClick, onAuthRequired, disabled, className }: Props) {
  return (
    <Tooltip content={HINT}>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={disabled}
        aria-label={`Rewrite with AI. ${HINT}`}
        className={cn(
          'gap-1.5 border border-[var(--color-primary-200)]/50 bg-[var(--color-primary-100)]/40 font-medium text-[var(--color-primary-400)] shadow-sm backdrop-blur-sm hover:bg-[var(--color-primary-100)]/70',
          className
        )}
        onClick={() => {
          if (onAuthRequired) {
            onAuthRequired();
            return;
          }
          onClick();
        }}
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-[var(--color-accent-mint)]" />
        Rewrite With AI
      </Button>
    </Tooltip>
  );
}
