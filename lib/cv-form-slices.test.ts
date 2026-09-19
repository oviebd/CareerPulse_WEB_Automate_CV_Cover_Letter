import { describe, expect, it } from 'vitest';
import { createEmptyCVData } from '@/src/utils/cvDefaults';
import {
  cvDataToFormSlices,
  formSlicesToCvData,
  type FormSlices,
} from '@/lib/cv-form-slices';
import { generateId } from '@/lib/utils';

const design = {
  preferred_template_id: 'classic',
  accent_color: '#2563EB',
  font_family: 'Inter',
};

function roundTripLinks(slices: Partial<FormSlices>) {
  const base = cvDataToFormSlices(createEmptyCVData());
  const merged: FormSlices = { ...base, ...slices };
  const prev = createEmptyCVData();
  const cv = formSlicesToCvData(prev, merged, design);
  return cvDataToFormSlices(cv).links;
}

describe('cv-form-slices extra profile links', () => {
  it('keeps an empty row after Add link round-trip', () => {
    const emptyRow = { id: generateId(), label: '', url: '' };
    const links = roundTripLinks({ links: [emptyRow] });
    expect(links).toHaveLength(1);
    expect(links[0].id).toBe(emptyRow.id);
    expect(links[0].label).toBe('');
    expect(links[0].url).toBe('');
  });

  it('preserves custom labels in personal.links.other', () => {
    const row = {
      id: generateId(),
      label: 'Twitter',
      url: 'https://x.com/me',
    };
    const prev = createEmptyCVData();
    const slices = {
      ...cvDataToFormSlices(prev),
      links: [row],
    };
    const cv = formSlicesToCvData(prev, slices, design);
    expect(cv.personal.links.other).toEqual([
      { id: row.id, label: 'Twitter', url: 'https://x.com/me' },
    ]);
    expect(roundTripLinks({ links: [row] })).toEqual([row]);
  });

  it('rebuilds legacy named-key-only CVs for the Header list', () => {
    const cv = createEmptyCVData();
    cv.personal.links.portfolio = 'https://portfolio.example';
    cv.personal.links.orcid = 'https://orcid.org/0000';
    const links = cvDataToFormSlices(cv).links;
    expect(links).toHaveLength(2);
    expect(links.map((l) => l.label).sort()).toEqual(['ORCID', 'Portfolio']);
  });
});
