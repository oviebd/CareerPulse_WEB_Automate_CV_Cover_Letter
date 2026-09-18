import { describe, expect, it } from 'vitest';
import { canAccessFeature } from '@/lib/subscription';

describe('export feature gates', () => {
  it('free tier cannot export PDF or DOCX', () => {
    expect(canAccessFeature('free', 'pdfExport')).toBe(false);
    expect(canAccessFeature('free', 'docxExport')).toBe(false);
  });

  it('pro tier can export PDF and DOCX', () => {
    expect(canAccessFeature('pro', 'pdfExport')).toBe(true);
    expect(canAccessFeature('pro', 'docxExport')).toBe(true);
  });
});
