/** Shared class strings for CV editor surfaces (theme tokens). */

/*
  Layout note (2026 refactor): The previous core editor used a 2-column split (editor vs. wide preview + always-visible ATS).
  That squeezed the form, stacked heavy chrome at the top, and kept ATS in the reading flow. The shell now uses a 3-column
  grid with a compact sticky top bar, ATS in a right drawer, and optional focus modes so the editor regains canvas space
  without removing features.
*/

export const CV_FORM_CARD =
  'rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]/90 p-4 shadow-sm backdrop-blur-sm sm:p-5';

/** Primary editing canvas — extra breathing room vs. the legacy card. */
export const CV_EDITOR_CANVAS =
  'rounded-2xl border border-[var(--color-border)]/80 bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)] backdrop-blur-sm sm:p-6';

export const CV_SECTION_H2 = 'font-display text-lg font-semibold text-[var(--color-text-primary)]';

export const CV_INPUT =
  'rounded-btn border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition duration-200 placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary-500)] focus:shadow-[0_0_0_3px_var(--color-focus-ring)]';

export const CV_TEXTAREA =
  'w-full rounded-btn border border-[var(--color-border)] bg-[var(--color-input-bg)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none transition duration-200 placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary-500)] focus:shadow-[0_0_0_3px_var(--color-focus-ring)]';

export const CV_NESTED_CARD =
  'rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm';

export const CV_SHELL_HEADER =
  'glass-panel sticky top-0 z-20 rounded-card border border-[var(--color-border)] p-3 backdrop-blur-xl';
