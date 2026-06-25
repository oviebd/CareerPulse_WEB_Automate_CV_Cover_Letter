'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface CvTitleModalProps {
  isOpen: boolean;
  defaultTitle: string;
  onClose: () => void;
  onConfirm: (title: string) => void | Promise<void>;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export function CvTitleModal({
  isOpen,
  defaultTitle,
  onClose,
  onConfirm,
  isSubmitting = false,
  submitLabel = 'Save',
}: CvTitleModalProps) {
  const [title, setTitle] = useState(defaultTitle);

  useEffect(() => {
    if (isOpen) setTitle(defaultTitle);
  }, [isOpen, defaultTitle]);

  const canSubmit = title.trim().length > 0 && !isSubmitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    await onConfirm(title.trim());
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Name this CV">
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <Input
          label="CV title"
          name="cv_title"
          placeholder="e.g. John Doe (12 june 26)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
          required
          disabled={isSubmitting}
        />
        <p className="text-xs text-[var(--color-muted)]">
          This is the display name shown in your CV library.
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting} disabled={!canSubmit}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
