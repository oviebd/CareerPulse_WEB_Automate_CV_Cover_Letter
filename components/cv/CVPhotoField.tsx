'use client';

import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

type Props = {
  photoUrl: string | null | undefined;
  onPhotoUrl: (url: string | null) => void;
};

export function CVPhotoField({ photoUrl, onPhotoUrl }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErr('Please choose a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErr('Image must be 2MB or smaller.');
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setErr('You need to be signed in.');
        setBusy(false);
        return;
      }
      const ext =
        file.type === 'image/png'
          ? 'png'
          : file.type === 'image/webp'
            ? 'webp'
            : 'jpg';
      const path = `${user.id}/cv-photo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('cv-photos').upload(path, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type,
      });
      if (upErr) {
        setErr(upErr.message);
        setBusy(false);
        return;
      }
      const { data } = supabase.storage.from('cv-photos').getPublicUrl(path);
      if (!data?.publicUrl) {
        setErr('Could not get public URL for photo.');
        setBusy(false);
        return;
      }
      onPhotoUrl(data.publicUrl);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="mb-1 block text-sm font-medium text-[var(--color-secondary)]">Profile photo</p>
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--color-border)] bg-slate-100">
          {photoUrl ? (
            <img src={photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-[var(--color-muted)]">No photo</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => void onFile(e)}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={busy}
            onClick={() => inputRef.current?.click()}
          >
            {photoUrl ? 'Replace photo' : 'Upload photo'}
          </Button>
          {photoUrl ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => onPhotoUrl(null)}>
              Remove photo
            </Button>
          ) : null}
        </div>
      </div>
      {err ? <p className="mt-2 text-xs text-[var(--color-danger)]">{err}</p> : null}
      <p className="mt-1 text-xs text-[var(--color-muted)]">JPEG, PNG or WebP, max 2MB.</p>
    </div>
  );
}
