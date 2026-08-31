'use client';

import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';

export function UnsavedLeaveModal({
  isOpen,
  onClose,
  onDiscard,
  onSaveAndLeave,
  saving = false,
  entityLabel = 'document',
}: {
  isOpen: boolean;
  onClose: () => void;
  onDiscard: () => void;
  onSaveAndLeave: () => void;
  saving?: boolean;
  /** e.g. "CV" or "cover letter" for copy */
  entityLabel?: string;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Unsaved changes">
      <p className="text-sm text-[var(--color-text-secondary)]">
        This {entityLabel} is not saved yet. Leave without saving, or save and go back.
      </p>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="secondary" size="sm" onClick={onDiscard} disabled={saving}>
          Discard
        </Button>
        <Button
          variant="primary"
          size="sm"
          loading={saving}
          disabled={saving}
          onClick={onSaveAndLeave}
        >
          Save and leave
        </Button>
      </div>
    </Modal>
  );
}
