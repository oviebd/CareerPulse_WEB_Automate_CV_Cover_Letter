'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';

export default function AccountSettingsPage() {
  const { toast } = useToast();
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);
  const [name, setName] = useState(profile?.full_name ?? '');
  const [deletePhrase, setDeletePhrase] = useState('');

  async function saveName() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('profiles').update({ full_name: name }).eq('id', user.id);
    if (profile) setProfile({ ...profile, full_name: name });
    toast('Profile updated.', 'success');
  }

  async function exportData() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [cv, letters, apps] = await Promise.all([
      supabase.from('cvs').select('*').eq('user_id', user.id),
      supabase.from('cover_letters').select('*').eq('user_id', user.id),
      supabase.from('jobs').select('*').eq('user_id', user.id),
    ]);
    const blob = new Blob(
      [JSON.stringify({ cv: cv.data, cover_letters: letters.data, applications: apps.data }, null, 2)],
      { type: 'application/json' }
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'cv-app-export.json';
    a.click();
  }

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <h1 className="font-display text-2xl font-bold">Account</h1>
      <div className="space-y-3">
        <Input label="Display name" value={name} onChange={(e) => setName(e.target.value)} />
        <Button variant="primary" size="sm" onClick={() => void saveName()}>
          Save name
        </Button>
        <p className="text-xs text-[var(--color-muted)]">
          Email and password changes use Supabase Auth in the hosted UI or your project settings.
        </p>
      </div>
      <div>
        <h2 className="font-semibold">Data export (GDPR)</h2>
        <Button variant="secondary" className="mt-2" onClick={() => void exportData()}>
          Download JSON
        </Button>
      </div>
      <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
        <h2 className="font-semibold text-red-900">Delete account</h2>
        <p className="mt-1 text-sm text-red-800">
          Type DELETE to confirm. This app does not remove the auth user automatically; disable or delete the user in Supabase Dashboard after clearing data.
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
          disabled={deletePhrase !== 'DELETE'}
          onClick={() => toast('Remove data in Supabase and delete auth user from Dashboard.', 'info')}
        >
          I understand
        </Button>
      </div>
    </div>
  );
}
