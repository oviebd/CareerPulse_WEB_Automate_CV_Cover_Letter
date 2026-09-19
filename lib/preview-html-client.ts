export type PreviewBlobRefs = {
  urlRef: { current: string | null };
  htmlRef: { current: string | null };
};

export type ApplyPreviewHtmlResult = {
  applied: boolean;
  url: string | null;
};

/** Fetch HTML preview and update blob URL only when content changed (avoids iframe flash). */
export async function applyPreviewHtmlResponse(
  html: string,
  refs: PreviewBlobRefs
): Promise<ApplyPreviewHtmlResult> {
  if (refs.htmlRef.current === html && refs.urlRef.current) {
    return { applied: false, url: refs.urlRef.current };
  }
  refs.htmlRef.current = html;
  if (refs.urlRef.current) {
    URL.revokeObjectURL(refs.urlRef.current);
  }
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  refs.urlRef.current = url;
  return { applied: true, url };
}

export function revokePreviewBlob(refs: PreviewBlobRefs): void {
  if (refs.urlRef.current) {
    URL.revokeObjectURL(refs.urlRef.current);
    refs.urlRef.current = null;
  }
  refs.htmlRef.current = null;
}
