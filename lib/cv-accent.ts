/** Default CV accent — Ink & Azure brand primary (#2563EB). */
export const DEFAULT_CV_ACCENT = '#2563EB';

/** Human names for the editor swatches. Keys match the existing hex values. */
export const CV_ACCENT_SWATCH_NAMES: Record<string, string> = {
  '#2563EB': 'Azure',
  '#00D4A8': 'Teal',
  '#7c3aed': 'Violet',
  '#dc2626': 'Red',
  '#0f172a': 'Ink',
  '#10b981': 'Emerald',
  '#f59e0b': 'Amber',
};

export function cvAccentSwatchName(color: string): string {
  return CV_ACCENT_SWATCH_NAMES[color] ?? 'Accent';
}
