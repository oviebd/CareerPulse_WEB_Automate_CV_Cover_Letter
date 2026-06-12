'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useUpsertJobApplication } from '@/hooks/useTracker';
import { useToast } from '@/components/ui/toast';
import type { KanbanColumn } from '@/lib/job-status-ui';
import { COLUMN_DB_STATUSES, KANBAN_COLUMN_CONFIG, KANBAN_COLUMNS } from '@/lib/job-status-ui';

interface AddJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pre-select which column (status) the job starts in */
  initialColumn?: KanbanColumn;
}

export function AddJobModal({ isOpen, onClose, initialColumn = 'wishlist' }: AddJobModalProps) {
  const { toast } = useToast();
  const create = useUpsertJobApplication();

  const [companyName, setCompanyName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [column, setColumn] = useState<KanbanColumn>(initialColumn);

  const canSubmit = companyName.trim().length > 0 && jobTitle.trim().length > 0;

  function reset() {
    setCompanyName('');
    setJobTitle('');
    setJobUrl('');
    setNotes('');
    setColumn(initialColumn);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      await create.mutateAsync({
        company_name: companyName.trim(),
        job_title: jobTitle.trim(),
        job_url: jobUrl.trim() || undefined,
        notes: notes.trim() || undefined,
        status: COLUMN_DB_STATUSES[column][0],
      });
      toast('Job added to tracker.', 'success');
      handleClose();
    } catch {
      toast('Failed to add job. Please try again.', 'error');
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Track a Job">
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <Input
          label="Company Name *"
          name="company_name"
          placeholder="e.g. Stripe"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          autoFocus
          required
        />
        <Input
          label="Job Title *"
          name="job_title"
          placeholder="e.g. Senior Software Engineer"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          required
        />
        <Input
          label="Job URL"
          name="job_url"
          type="url"
          placeholder="https://..."
          value={jobUrl}
          onChange={(e) => setJobUrl(e.target.value)}
        />

        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text-primary)]">
            Status
          </label>
          <div className="flex flex-wrap gap-2">
            {KANBAN_COLUMNS.filter((c) => c !== 'archived').map((col) => {
              const cfg = KANBAN_COLUMN_CONFIG[col];
              return (
                <button
                  key={col}
                  type="button"
                  onClick={() => setColumn(col)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    column === col
                      ? `${cfg.borderClass} bg-[var(--color-surface-2)]`
                      : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-border-hover)]'
                  }`}
                >
                  {cfg.emoji} {cfg.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label
            htmlFor="add-job-notes"
            className="mb-1 block text-sm font-medium text-[var(--color-text-primary)]"
          >
            Notes
          </label>
          <textarea
            id="add-job-notes"
            rows={3}
            className="w-full rounded-btn border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary-500)] focus:outline-none focus:shadow-[0_0_0_3px_var(--color-focus-ring)]"
            placeholder="Any notes about this role..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!canSubmit}
            loading={create.isPending}
          >
            Add Job
          </Button>
        </div>
      </form>
    </Modal>
  );
}
