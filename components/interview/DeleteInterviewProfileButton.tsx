'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useDeleteInterviewProfile } from '@/hooks/useInterview';

export function DeleteInterviewProfileButton({
  profileId,
  label,
  redirectTo,
}: {
  profileId: string;
  label?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const remove = useDeleteInterviewProfile();
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleDelete() {
    try {
      await remove.mutateAsync(profileId);
      toast('Interview preparation deleted.', 'success');
      setConfirmOpen(false);
      if (redirectTo) router.push(redirectTo);
    } catch {
      toast('Could not delete this preparation.', 'error');
    }
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-md p-2 text-[var(--color-muted)] hover:bg-[var(--color-danger)]/10 hover:text-[var(--color-danger)]"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setConfirmOpen((v) => !v);
        }}
        aria-label="Delete preparation"
      >
        <Trash2 className="h-4 w-4" />
        {label ? <span className="text-xs font-semibold">{label}</span> : null}
      </button>
      {confirmOpen ? (
        <div
          className="absolute right-0 z-30 mt-1 w-56 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-xs shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="font-medium text-[var(--color-text-primary)]">
            Delete this interview preparation?
          </p>
          <p className="mt-1 text-[var(--color-muted)]">
            Quizzes, mock sessions, and progress for this role will be removed.
          </p>
          <div className="mt-2 flex justify-end gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="min-w-0"
              onClick={() => setConfirmOpen(false)}
              disabled={remove.isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="danger"
              className="min-w-0"
              loading={remove.isPending}
              onClick={() => void handleDelete()}
            >
              Delete
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
