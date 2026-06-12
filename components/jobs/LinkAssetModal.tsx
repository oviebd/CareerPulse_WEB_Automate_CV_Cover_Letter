'use client';

import { useState } from 'react';
import { FileText, Mail, Search } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/useAuthStore';
import type { CVProfile } from '@/types';

interface LinkAssetModalProps {
  jobId: string;
  type: 'cv' | 'cover_letter';
  isOpen: boolean;
  onClose: () => void;
}

interface CoverLetterItem {
  id: string;
  name: string | null;
  job_ids: string[];
  created_at: string;
}

function useLinkableCVs(jobId: string, enabled: boolean) {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['linkable-cvs', userId, jobId],
    enabled: enabled && !!userId,
    queryFn: async () => {
      const res = await fetch('/api/cvs');
      if (!res.ok) throw new Error('Failed to load CVs');
      const data = (await res.json()) as CVProfile[];
      // Show all CVs (general and job-specific), sorted by name
      return data.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
    },
    staleTime: 30_000,
  });
}

function useLinkableCoverLetters(jobId: string, enabled: boolean) {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['linkable-cls', userId, jobId],
    enabled: enabled && !!userId,
    queryFn: async () => {
      const res = await fetch('/api/cover-letters');
      if (!res.ok) throw new Error('Failed to load cover letters');
      const data = (await res.json()) as CoverLetterItem[];
      return data.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
    },
    staleTime: 30_000,
  });
}

export function LinkAssetModal({ jobId, type, isOpen, onClose }: LinkAssetModalProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [linking, setLinking] = useState<string | null>(null);

  const { data: cvs = [], isLoading: cvsLoading } = useLinkableCVs(jobId, type === 'cv' && isOpen);
  const { data: cls = [], isLoading: clsLoading } = useLinkableCoverLetters(jobId, type === 'cover_letter' && isOpen);

  const isLoading = type === 'cv' ? cvsLoading : clsLoading;
  const Icon = type === 'cv' ? FileText : Mail;
  const title = type === 'cv' ? 'Link a CV' : 'Link a Cover Letter';

  const items = (type === 'cv' ? cvs : cls)
    .filter((item) => {
      const name = (item as CVProfile).name ?? (item as CoverLetterItem).name ?? '';
      return name.toLowerCase().includes(search.toLowerCase());
    })
    .map((item) => ({
      id: item.id,
      name: (item as CVProfile).name ?? (item as CoverLetterItem).name ?? 'Untitled',
      alreadyLinked: ((item as CVProfile | CoverLetterItem).job_ids ?? []).includes(jobId),
      info: type === 'cv'
        ? `${(item as CVProfile).completion_percentage ?? 0}% complete`
        : new Date((item as CoverLetterItem).created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    }));

  async function handleLink(assetId: string) {
    setLinking(assetId);
    try {
      const res = await fetch(`/api/jobs/${jobId}/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, assetId, action: 'link' }),
      });
      if (!res.ok) throw new Error('Failed to link');
      toast(`${type === 'cv' ? 'CV' : 'Cover letter'} linked successfully.`, 'success');
      void qc.invalidateQueries({ queryKey: ['job-applications'] });
      void qc.invalidateQueries({ queryKey: ['linkable-cvs'] });
      void qc.invalidateQueries({ queryKey: ['linkable-cls'] });
      onClose();
    } catch {
      toast('Failed to link. Please try again.', 'error');
    } finally {
      setLinking(null);
    }
  }

  async function handleUnlink(assetId: string) {
    setLinking(assetId);
    try {
      const res = await fetch(`/api/jobs/${jobId}/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, assetId, action: 'unlink' }),
      });
      if (!res.ok) throw new Error('Failed to unlink');
      toast(`${type === 'cv' ? 'CV' : 'Cover letter'} unlinked.`, 'success');
      void qc.invalidateQueries({ queryKey: ['job-applications'] });
      void qc.invalidateQueries({ queryKey: ['linkable-cvs'] });
      void qc.invalidateQueries({ queryKey: ['linkable-cls'] });
    } catch {
      toast('Failed to unlink. Please try again.', 'error');
    } finally {
      setLinking(null);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} className="max-w-md">
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
        <input
          type="search"
          placeholder={`Search ${type === 'cv' ? 'CVs' : 'cover letters'}…`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] py-2 pl-9 pr-3 text-sm outline-none placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary-500)]"
        />
      </div>

      {isLoading ? (
        <p className="py-8 text-center text-sm text-[var(--color-muted)]">Loading…</p>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--color-muted)]">
          {search ? 'No results found.' : `No ${type === 'cv' ? 'CVs' : 'cover letters'} found.`}
        </p>
      ) : (
        <ul className="max-h-72 space-y-2 overflow-y-auto">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-faint)] px-3 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <Icon className="h-4 w-4 shrink-0 text-[var(--color-muted)]" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                    {item.name}
                  </p>
                  <p className="text-xs text-[var(--color-muted)]">{item.info}</p>
                </div>
              </div>
              {item.alreadyLinked ? (
                <Button
                  size="sm"
                  variant="ghost"
                  loading={linking === item.id}
                  onClick={() => void handleUnlink(item.id)}
                  className="shrink-0 text-xs text-[var(--color-muted)]"
                >
                  Unlink
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="primary"
                  loading={linking === item.id}
                  onClick={() => void handleLink(item.id)}
                  className="shrink-0 text-xs"
                >
                  Link
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
