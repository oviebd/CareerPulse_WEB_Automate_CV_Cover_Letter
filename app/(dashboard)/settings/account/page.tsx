'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { apiFetch } from '@/lib/api-fetch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';

export default function AccountSettingsPage() {
  const { toast } = useToast();
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);
  const [name, setName] = useState(profile?.full_name ?? '');
  const [deletePhrase, setDeletePhrase] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  async function saveName() {
    setSavingName(true);
    try {
      const updated = await apiFetch<{ full_name?: string | null }>('/api/account', {
        method: 'PATCH',
        body: JSON.stringify({ full_name: name }),
      });
      if (profile) setProfile({ ...profile, full_name: updated.full_name ?? name });
      toast('Profile updated.', 'success');
    } finally {
      setSavingName(false);
    }
  }

  async function exportData() {
    setExportingData(true);
    try {
      const data = await apiFetch<{
        cv: unknown[];
        cover_letters: unknown[];
        applications: unknown[];
      }>('/api/account/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'cv-app-export.json';
      a.click();
    } finally {
      setExportingData(false);
    }
  }

  async function deleteAccount() {
    setDeletingAccount(true);
    try {
      await apiFetch('/api/account', { method: 'DELETE' });
      window.location.href = '/';
    } catch {
      toast('Could not delete account. Please try again.', 'error');
      setDeletingAccount(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <h1 className="font-display text-2xl font-bold">Account</h1>
      <div className="space-y-3">
        <Input label="Display name" value={name} onChange={(e) => setName(e.target.value)} />
        <Button variant="primary" size="sm" onClick={() => void saveName()} loading={savingName}>
          Save name
        </Button>
        <p className="text-xs text-[var(--color-muted)]">
          To change your email or password, contact support or create a new account.
        </p>
      </div>
      <div>
        <h2 className="font-semibold">Data export (GDPR)</h2>
        <Button variant="secondary" className="mt-2" onClick={() => void exportData()} loading={exportingData}>
          Download JSON
        </Button>
      </div>
      <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
        <h2 className="font-semibold text-red-900">Delete account</h2>
        <p className="mt-1 text-sm text-red-800">
          Type DELETE to confirm. This permanently removes your profile, CVs, cover letters, and job data.
        </p>
        <Input
          className="mt-2"
          value={deletePhrase}
          onChange={(e) => setDeletePhrase(e.target.value)}
        />
        <Button
          variant="danger"
          size="sm"
          className="mt-2"
          disabled={deletePhrase !== 'DELETE' || deletingAccount}
          loading={deletingAccount}
          onClick={() => void deleteAccount()}
        >
          I understand
        </Button>
      </div>
    </div>
  );
}
