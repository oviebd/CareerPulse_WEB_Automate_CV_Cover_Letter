'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { uploadFileWithProgress, createSignedUploadUrl, removeUploadedFile } from '@/lib/file-upload-client';
import { isAllowedCvFile } from '@/lib/cv-file';
import type { ExtractedCoverLetter } from '@/types';

const MAX = 10 * 1024 * 1024;

const EXTRACT_ERROR_HINT: Record<string, string> = {
  Unauthorized: 'Session expired — sign in again.',
  fileUrl_required: 'Missing file URL — try uploading again.',
  file_fetch_failed: 'Could not read the uploaded file. Try uploading again.',
  invalid_file_type: 'File was not recognized as PDF or DOCX.',
  invalid_file_url: 'Invalid file URL.',
  pdf_parse_failed: 'Could not read text from this file. Try exporting as a text-based PDF or DOCX.',
  empty_document: 'No readable text found. Scanned/image PDFs are not supported — use a text-based PDF or DOCX.',
  RATE_LIMIT: 'Too many attempts — wait a minute and try again.',
  file_too_large: 'File is too large.',
  extraction_failed: 'Import failed. Try again or paste the letter instead.',
};

type Props = {
  /**
   * When set, only extracts text and returns it (for Enhance Existing).
   * When omitted, creates a cover letter and opens the editor.
   */
  onExtracted?: (letter: ExtractedCoverLetter) => void;
};

export function CoverLetterUploadForm({ onExtracted }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const { toast } = useToast();
  const [phase, setPhase] = useState<
    'idle' | 'uploading' | 'analysing' | 'complete'
  >('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  function reportError(message: string) {
    console.error('[CL upload]', message);
    setErrorMessage(message);
    toast(message, 'error');
  }

  async function runUpload(file: File) {
    setErrorMessage(null);
    setUploadProgress(0);
    setPhase('uploading');
    try {
      if (!userId) {
        reportError('Session expired — sign in again.');
        setPhase('idle');
        setUploadProgress(0);
        router.push('/login?returnTo=%2Fcover-letters%2Fnew%2Fupload');
        return;
      }

      const ext = file.name.split('.').pop()?.toLowerCase();
      const path = `${userId}/cl-${Date.now()}.${ext === 'docx' ? 'docx' : 'pdf'}`;
      let canDeleteFromStorage = false;

      const { error: upErr } = await uploadFileWithProgress(
        'cv-uploads',
        path,
        file,
        { cacheControl: '3600', upsert: true },
        (p) => setUploadProgress(p)
      );
      if (upErr) {
        const hint = upErr.message.includes('Bucket not found')
          ? `${upErr.message} Ensure the cv-uploads bucket exists.`
          : `${upErr.message} If storage fails, check the cv-uploads bucket.`;
        reportError(hint);
        setPhase('idle');
        setUploadProgress(0);
        return;
      }

      canDeleteFromStorage = true;

      const { signedUrl, error: signErr } = await createSignedUploadUrl('cv-uploads', path, 3600);
      if (signErr || !signedUrl) {
        console.error('createSignedUrl', signErr);
        reportError(signErr?.message ?? 'Could not create a signed URL for the file.');
        setPhase('idle');
        setUploadProgress(0);
        if (canDeleteFromStorage) {
          try {
            await removeUploadedFile('cv-uploads', path);
          } catch (delErr) {
            console.warn('cv-uploads remove failed', delErr);
          }
        }
        return;
      }

      setPhase('analysing');

      try {
        let res: Response;
        try {
          res = await fetch('/api/cover-letter/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ fileUrl: signedUrl }),
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
        let json: {
          error?: string;
          detail?: string;
          letter?: ExtractedCoverLetter;
          preferred_template_id?: string;
        } = {};
        try {
          json = raw
            ? (JSON.parse(raw) as typeof json)
            : {};
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

        if (!res.ok || !json.letter) {
          const hint =
            (json.error && EXTRACT_ERROR_HINT[json.error]) ||
            (json.error
              ? `Import failed (${json.error}).`
              : `Import failed (HTTP ${res.status}).`);
          reportError(json.detail ? `${hint} (${json.detail})` : hint);
          setPhase('idle');
          setUploadProgress(0);
          if (json.error === 'Unauthorized') {
            router.push('/login');
          }
          return;
        }

        if (onExtracted) {
          onExtracted(json.letter);
          setPhase('complete');
          setUploadProgress(100);
          toast('Cover letter text imported.', 'success');
          return;
        }

        const nameParts = [
          json.letter.job_title,
          json.letter.company_name,
        ].filter(Boolean);
        const name =
          nameParts.length > 0
            ? nameParts.join(' — ').slice(0, 200)
            : 'Uploaded Cover Letter';

        const createRes = await fetch('/api/cover-letters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            content: json.letter.content,
            template_id: json.preferred_template_id ?? 'cl-classic',
            source_type: 'existing_cover_letter',
            company_name: json.letter.company_name,
            job_title: json.letter.job_title,
            applicant_name: json.letter.applicant_name,
            applicant_role: json.letter.applicant_role,
            applicant_email: json.letter.applicant_email,
            applicant_phone: json.letter.applicant_phone,
            applicant_location: json.letter.applicant_location,
          }),
        });
        if (!createRes.ok) {
          reportError('Could not save cover letter. Please try again.');
          setPhase('idle');
          setUploadProgress(0);
          return;
        }
        const created = (await createRes.json()) as { id: string };
        void queryClient.invalidateQueries({ queryKey: ['cover-letters'] });
        setPhase('complete');
        setUploadProgress(100);
        toast('Cover letter imported. Review and edit.', 'success');
        router.push(`/cover-letters/${created.id}`);
      } finally {
        if (canDeleteFromStorage) {
          try {
            await removeUploadedFile('cv-uploads', path);
          } catch (delErr) {
            console.warn('cv-uploads remove failed', delErr);
          }
        }
      }
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
          Drop your cover letter here or click to browse
        </span>
        <span className="mt-2 text-xs text-[var(--color-muted)]">
          PDF or DOCX · max 10MB
        </span>
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
          onClick={() => {
            if (selectedFile && phase === 'idle') void runUpload(selectedFile);
          }}
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

      {phase !== 'idle' ? (
        <div className="mt-6">
          <div className="mb-1 flex justify-between text-xs text-[var(--color-muted)]">
            <span>
              {phase === 'uploading'
                ? 'Uploading file…'
                : phase === 'complete'
                  ? 'Done'
                  : 'Reading document and extracting…'}
            </span>
            {phase === 'uploading' ? (
              <span className="font-medium tabular-nums text-[var(--color-secondary)]">
                {uploadProgress}%
              </span>
            ) : phase === 'analysing' ? (
              <span className="animate-pulse">Working…</span>
            ) : null}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--color-border)]">
            <div
              className={`h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-150 ease-out ${
                phase === 'analysing' ? 'animate-pulse' : ''
              }`}
              style={{
                width:
                  phase === 'uploading'
                    ? `${uploadProgress}%`
                    : phase === 'complete'
                      ? '100%'
                      : '85%',
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
