export function validatePdfOrDocx(buffer: Buffer): 'pdf' | 'docx' | null {
  if (buffer.length >= 4 && buffer.subarray(0, 4).toString('ascii') === '%PDF') {
    return 'pdf';
  }
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  ) {
    return 'docx';
  }
  return null;
}

const MAX_BYTES = 10 * 1024 * 1024;

export function assertFileSize(len: number): void {
  if (len > MAX_BYTES) throw new Error('FILE_TOO_LARGE');
}
