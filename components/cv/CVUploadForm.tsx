'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { useCVProfile } from '@/hooks/useCV';
import { useSubscription } from '@/hooks/useSubscription';
import { uploadCvFileWithProgress } from '@/lib/cv-storage-upload';
import { isAllowedCvFile } from '@/lib/cv-file';
import type { CVProfile } from '@/types';

const MAX = 10 * 1024 * 1024;

const EXTRACT_ERROR_HINT: Record<string, string> = {
  Unauthorized: 'Session expired — sign in again.',
  fileUrl_required: 'Missing file URL — try uploading again.',
  file_fetch_failed: 'Could not read the file from storage. Check Storage bucket and policies.',
  invalid_file_type: 'File was not recognized as PDF or DOCX.',
  extraction_failed: 'Text or AI extraction failed. Add ANTHROPIC_API_KEY or try the manual editor.',
  save_failed: 'Could not save your profile to the database.',
  file_too_large: 'File is too large.',
  RATE_LIMIT: 'Too many attempts — wait a minute and try again.',
};

export function CVUploadForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: existing } = useCVProfile();
  const { limits } = useSubscription();
  const [phase, setPhase] = useState<
    'idle' | 'uploading' | 'analysing' | 'complete'
  >('idle');
  const [showOverwrite, setShowOverwrite] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  function reportError(message: string) {
    console.error('[CV upload]', message);
    setErrorMessage(message);
    toast(message, 'error');
  }

  async function runUpload(file: File, force: boolean) {
    setErrorMessage(null);
    setUploadProgress(0);
    setPhase('uploading');
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setPhase('idle');
        reportError('You need to be signed in to upload.');
        router.push('/login');
        return;
      }

      const ext = file.name.split('.').pop()?.toLowerCase();
      const path = `${user.id}/${Date.now()}.${ext === 'docx' ? 'docx' : 'pdf'}`;

      const { error: upErr } = await uploadCvFileWithProgress(
        supabase,
        path,
        file,
        { cacheControl: '3600', upsert: true },
        (p) => setUploadProgress(p)
      );
      if (upErr) {
        const hint = upErr.message.includes('Bucket not found')
          ? `${upErr.message} Apply supabase/migrations/002_storage.sql and ensure the bucket exists.`
          : `${upErr.message} If storage fails, check the cv-uploads bucket and RLS policies.`;
        reportError(hint);
        setPhase('idle');
        setUploadProgress(0);
        return;
      }

      const { data: signed, error: signErr } = await supabase.storage
        .from('cv-uploads')
        .createSignedUrl(path, 3600);
      if (signErr || !signed?.signedUrl) {
        console.error('createSignedUrl', signErr);
        reportError(
          signErr?.message ?? 'Could not create a signed URL for the file.'
        );
        setPhase('idle');
        setUploadProgress(0);
        return;
      }

      setPhase('analysing');

      let res: Response;
      try {
        res = await fetch('/api/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ fileUrl: signed.signedUrl, force }),
        });
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : 'Could not reach the server.';
        reportError(`Import request failed: ${msg}`);
        setPhase('idle');
        setUploadProgress(0);
        return;
      }

      const raw = await res.text();
      let json: { error?: string; cvProfile?: CVProfile } = {};
      try {
        json = raw ? (JSON.parse(raw) as { error?: string; cvProfile?: CVProfile }) : {};
      } catch {
        reportError(
          raw
            ? `Import failed (${res.status}): ${raw.slice(0, 280)}`
            : `Import failed: empty response (HTTP ${res.status}).`
        );
        setPhase('idle');
        setUploadProgress(0);
        return;
      }

      if (!res.ok) {
        if (json.error === 'CV_UPLOAD_LIMIT') {
          setShowOverwrite(true);
          setPhase('idle');
          setUploadProgress(0);
          return;
        }
        const hint =
          (json.error && EXTRACT_ERROR_HINT[json.error]) ||
          (json.error
            ? `Import failed (${json.error}).`
            : `Import failed (HTTP ${res.status}).`);
        reportError(hint);
        setPhase('idle');
        setUploadProgress(0);
        if (json.error === 'Unauthorized') {
          router.push('/login');
        }
        return;
      }

      setPhase('complete');
      setUploadProgress(100);
      toast('CV imported.', 'success');
      if (json.cvProfile) {
        queryClient.setQueryData(['cv-profile'], json.cvProfile);
      }
      await queryClient.invalidateQueries({ queryKey: ['cv-profile'] });
      router.push('/cv/edit');
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      reportError(`Unexpected error: ${msg}`);
      setPhase('idle');
      setUploadProgress(0);
    }
  }

  function onPick(f: File | null) {
    if (!f) return;
    if (f.size > MAX) {
      toast('File must be under 10MB.', 'error');
      return;
    }
    if (!isAllowedCvFile(f)) {
      toast('Please choose a .pdf or .docx file.', 'error');
      return;
    }
    setErrorMessage(null);
    setSelectedFile(f);
  }

  function onUploadClick() {
    if (!selectedFile || phase !== 'idle') return;
    if (existing?.original_cv_file_url && limits.cvUploads === 1) {
      setShowOverwrite(true);
      return;
    }
    void runUpload(selectedFile, false);
  }

  return (
    <div className="mx-auto max-w-xl">
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-16 text-center transition hover:border-[var(--color-primary)]">
        <input
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />
        <span className="text-sm font-medium text-[var(--color-secondary)]">
          Drop your CV here or click to browse
        </span>
        <span className="mt-2 text-xs text-[var(--color-muted)]">PDF or DOCX · max 10MB</span>
        {selectedFile ? (
          <span className="mt-3 max-w-full truncate text-xs font-medium text-[var(--color-primary)]">
            {selectedFile.name}
          </span>
        ) : null}
      </label>
      <div className="mt-4 flex justify-center">
        <Button
          variant="primary"
          disabled={!selectedFile || phase !== 'idle'}
          onClick={onUploadClick}
        >
          Upload
        </Button>
      </div>

      {errorMessage ? (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100"
        >
          <p className="font-medium">Something went wrong</p>
          <p className="mt-1 whitespace-pre-wrap break-words">{errorMessage}</p>
        </div>
      ) : null}

      {phase === 'uploading' ? (
        <div className="mt-6">
          <div className="mb-1 flex justify-between text-xs text-[var(--color-muted)]">
            <span>Uploading file…</span>
            <span className="font-medium tabular-nums text-[var(--color-secondary)]">
              {uploadProgress}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--color-border)]">
            <div
              className="h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-150 ease-out"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      ) : null}

      {phase === 'analysing' || phase === 'complete' ? (
        <div className="mt-6">
          <div className="mb-1 flex justify-between text-xs text-[var(--color-muted)]">
            <span>
              {phase === 'complete'
                ? 'Done'
                : 'Reading document and extracting with AI…'}
            </span>
            {phase === 'analysing' ? (
              <span className="animate-pulse">Working…</span>
            ) : null}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--color-border)]">
            <div
              className={`h-full rounded-full bg-[var(--color-primary)] ${
                phase === 'analysing' ? 'animate-pulse' : ''
              }`}
              style={{
                width: phase === 'complete' ? '100%' : '85%',
              }}
            />
          </div>
        </div>
      ) : null}

      <Modal
        isOpen={showOverwrite}
        onClose={() => setShowOverwrite(false)}
        title="Replace existing CV?"
      >
        <p className="text-sm text-[var(--color-muted)]">
          Free accounts can store one extracted upload. Continue to replace your current profile data.
        </p>
        <div className="mt-4 flex gap-2">
          <Button
            variant="primary"
            onClick={() => {
              if (selectedFile) void runUpload(selectedFile, true);
              setShowOverwrite(false);
            }}
          >
            Replace
          </Button>
          <Button variant="secondary" onClick={() => setShowOverwrite(false)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
}
