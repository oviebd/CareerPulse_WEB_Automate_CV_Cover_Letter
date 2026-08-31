'use client';

/**
 * Client helpers for POST /api/export with a format picker.
 * CV exports return the file as a blob; cover-letter exports return a
 * signed storage URL. Both share the Pro-gate error code for DOCX.
 */

export type ExportFormat = 'pdf' | 'docx';

export type CvExportBody = {
  id?: string;
  job_cv_id?: string;
  template_id?: string;
  accent_color?: string;
  font_family?: string;
  cv_snapshot?: Record<string, unknown>;
};

export type CoverLetterExportBody = {
  id: string;
  template_id?: string;
  templateId?: string;
  content?: string;
  company_name?: string | null;
  job_title?: string | null;
  applicant_name?: string | null;
  applicant_role?: string | null;
  applicant_email?: string | null;
  applicant_phone?: string | null;
  applicant_location?: string | null;
  accent_color?: string;
};

export type ExportResult = 'ok' | 'upgrade_required' | 'error';

function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const m = header.match(/filename="?([^";]+)"?/i);
  return m ? m[1] : null;
}

/** Download a CV export (blob response) and return an outcome code. */
export async function downloadCvExport(
  body: CvExportBody,
  format: ExportFormat,
  fallbackName = format === 'docx' ? 'cv.docx' : 'cv.pdf'
): Promise<ExportResult> {
  try {
    const res = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, type: 'cv', format }),
    });
    if (res.status === 403) {
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      if (j?.error === 'docx_upgrade_required') return 'upgrade_required';
      return 'error';
    }
    if (!res.ok) return 'error';
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download =
      filenameFromDisposition(res.headers.get('Content-Disposition')) ??
      fallbackName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return 'ok';
  } catch (e) {
    console.error('downloadCvExport', e);
    return 'error';
  }
}

/** Export a cover letter (signed URL response) in a new tab. */
export async function exportCoverLetter(
  body: CoverLetterExportBody,
  format: ExportFormat
): Promise<ExportResult> {
  try {
    const res = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, type: 'cover_letter', format }),
    });
    const j = (await res.json().catch(() => null)) as {
      pdfUrl?: string;
      docxUrl?: string;
      error?: string;
    } | null;
    if (res.status === 403 && j?.error === 'docx_upgrade_required') {
      return 'upgrade_required';
    }
    const url = format === 'docx' ? j?.docxUrl : j?.pdfUrl;
    if (!url) return 'error';
    window.open(url, '_blank', 'noopener,noreferrer');
    return 'ok';
  } catch (e) {
    console.error('exportCoverLetter', e);
    return 'error';
  }
}
