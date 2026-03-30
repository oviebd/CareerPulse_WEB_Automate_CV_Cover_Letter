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
        'gap-1.5 border border-indigo-200/80 bg-gradient-to-r from-indigo-50 to-white font-medium text-indigo-900 shadow-sm hover:from-indigo-100/80 hover:to-indigo-50/50',
        className
      )}
      title="Rewrite with stronger verbs, metrics, and ATS-friendly phrasing"
      onClick={onClick}
    >
      <Sparkles className="h-3.5 w-3.5 shrink-0 text-indigo-600" />
      Rewrite With AI
    </Button>
  );
}
