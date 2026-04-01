'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

type Props = {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
};

/** Opens AI rewrite modal for the current field. */
export function CvAtsPolishButton({ onClick, disabled, className }: Props) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      disabled={disabled}
      className={cn(
        'gap-1.5 border border-[var(--color-primary-200)]/50 bg-[var(--color-primary-100)]/40 font-medium text-[var(--color-primary-400)] shadow-sm backdrop-blur-sm hover:bg-[var(--color-primary-100)]/70',
        className
      )}
      title="Rewrite with stronger verbs, metrics, and ATS-friendly phrasing"
      onClick={onClick}
    >
      <Sparkles className="h-3.5 w-3.5 shrink-0 text-[var(--color-accent-mint)]" />
      Rewrite With AI
    </Button>
  );
}
