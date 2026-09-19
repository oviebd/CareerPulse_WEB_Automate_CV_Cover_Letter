import { describe, expect, it } from 'vitest';
import {
  defaultCoreClDisplayName,
  defaultCoreCvDisplayName,
  defaultJobClDisplayName,
  defaultJobCvDisplayName,
  formatCvTitleDate,
  isPlaceholderCvName,
} from './cv-display-name';

describe('cv-display-name', () => {
  const date = new Date(2026, 5, 10);

  it('formats dates with abbreviated month', () => {
    expect(formatCvTitleDate(date)).toBe('10 jun 26');
  });

  it('builds core CV and CL titles', () => {
    expect(defaultCoreCvDisplayName('Habibur Rahman', date)).toBe(
      'CV _ Habibur Rahman _ 10 jun 26'
    );
    expect(defaultCoreClDisplayName('Habibur Rahman', date)).toBe(
      'CL _ Habibur Rahman _ 10 jun 26'
    );
  });

  it('treats generic library titles as placeholders', () => {
    expect(isPlaceholderCvName('Core CV')).toBe(true);
    expect(isPlaceholderCvName('core cv')).toBe(true);
    expect(isPlaceholderCvName('CV _ Habibur Rahman _ 10 jun 26')).toBe(false);
  });

  it('builds job-specific CV and CL titles', () => {
    expect(defaultJobCvDisplayName('senior iOS engineer', 'BdJobs', date)).toBe(
      'CV _ senior iOS engineer _ BdJobs _ 10 jun 26'
    );
    expect(defaultJobClDisplayName('senior iOS engineer', 'BdJobs', date)).toBe(
      'CL _ senior iOS engineer _ BdJobs _ 10 jun 26'
    );
  });
});
