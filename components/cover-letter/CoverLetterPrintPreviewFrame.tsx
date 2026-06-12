'use client';

import {
  DocumentPrintPreviewFrame,
  DOCUMENT_PREVIEW_A4_HEIGHT,
  DOCUMENT_PREVIEW_WIDTH,
  type DocumentPreviewMetrics,
} from '@/components/shared/DocumentPrintPreviewFrame';

/** @deprecated Use DOCUMENT_PREVIEW_WIDTH */
export const COVER_LETTER_DOC_WIDTH = DOCUMENT_PREVIEW_WIDTH;
/** @deprecated Use DOCUMENT_PREVIEW_A4_HEIGHT */
export const COVER_LETTER_DOC_HEIGHT = DOCUMENT_PREVIEW_A4_HEIGHT;

export type { DocumentPreviewMetrics };

/**
 * Cover letter templates use `body { width: 210mm; padding: 20mm; box-sizing: content-box }`.
 * Total body box ≈ 944 px — wider than the 794 px iframe — so content clips until overrides run.
 */
function injectCoverLetterPreviewOverrides(iframe: HTMLIFrameElement): void {
  try {
    const doc = iframe.contentDocument;
    if (!doc?.head) return;
    const existing = doc.getElementById('__cl-preview-overrides');
    if (existing) return;
    const style = doc.createElement('style');
    style.id = '__cl-preview-overrides';
    style.textContent = [
      'html{overflow:hidden!important;margin:0!important;padding:0!important;}',
      'body{box-sizing:border-box!important;width:794px!important;',
      'min-height:0!important;height:auto!important;overflow:visible!important;}',
    ].join('');
    doc.head.appendChild(style);
  } catch {
    // cross-origin frames are silently ignored
  }
}

type Props = {
  src: string | null;
  title: string;
  className?: string;
  isLoading?: boolean;
  /**
   * @deprecated Prefer leaving height unset so the frame sizes to content.
   * When provided, switches to thumbnail clip mode (fixed height + overflow hidden).
   */
  containerHeight?: number | string;
  onMetricsChange?: (metrics: DocumentPreviewMetrics) => void;
  zoom?: number;
};

export function CoverLetterPrintPreviewFrame({
  containerHeight,
  ...props
}: Props) {
  if (containerHeight != null) {
    return (
      <DocumentPrintPreviewFrame
        {...props}
        variant="thumbnail"
        thumbnailHeight={containerHeight}
        injectOverrides={injectCoverLetterPreviewOverrides}
      />
    );
  }

  return (
    <DocumentPrintPreviewFrame
      {...props}
      variant="document"
      injectOverrides={injectCoverLetterPreviewOverrides}
    />
  );
}
