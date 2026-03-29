/** PDF / DOCX only — many browsers omit or misreport MIME; use extension as fallback. */
export function isAllowedCvFile(file: File): boolean {
  const n = file.name.toLowerCase();
  if (n.endsWith('.pdf')) return true;
  if (n.endsWith('.docx')) return true;
  return (
    file.type === 'application/pdf' ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  );
}

/** Storage bucket allows only these exact types — never send application/octet-stream. */
export function getCvStorageContentType(file: File): string {
  const n = file.name.toLowerCase();
  if (n.endsWith('.pdf')) return 'application/pdf';
  if (n.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  if (file.type === 'application/pdf') return 'application/pdf';
  return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
}
