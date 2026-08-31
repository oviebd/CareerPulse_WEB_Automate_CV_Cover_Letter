import { sectionHint } from '@/lib/cv-editor-flow';
import type { CVFormTab } from '@/components/cv/CVFormFields';

export function SectionIntro({ tab }: { tab: CVFormTab }) {
  if (tab === 'design') return null;
  const meta = sectionHint(tab);
  return (
    <div className="mb-4">
      <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
        {meta.label}
      </h2>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{meta.hint}</p>
    </div>
  );
}
