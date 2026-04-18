'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { ComponentType } from 'react';
import type { CVFormTab } from '@/components/cv/CVFormFields';
import type { CVData, CVSectionVisibility, CVSectionVisibilityKey } from '@/types';
import { isCvSectionVisible, toggleCvSectionVisibility } from '@/lib/cv-section-visibility';
import { cvSectionHasFilledContent } from '@/lib/cv-sidebar-content';
import {
  Award,
  BookOpen,
  BriefcaseBusiness,
  Camera,
  ChevronDown,
  ChevronRight,
  FileBadge2,
  FlaskConical,
  GraduationCap,
  HeartHandshake,
  IdCard,
  Languages,
  Layers,
  Lightbulb,
  MapPin,
  Palette,
  Tag,
  UserRound,
  Users,
  Wrench,
} from 'lucide-react';

const ITEMS: Array<{
  id: CVFormTab;
  label: string;
  icon: ComponentType<{ className?: string }>;
  visibilityKey?: CVSectionVisibilityKey;
}> = [
  { id: 'photo', label: 'Photo', icon: Camera, visibilityKey: 'photo' },
  { id: 'header', label: 'Header', icon: IdCard },
  { id: 'address', label: 'Address', icon: MapPin, visibilityKey: 'address' },
  { id: 'summary', label: 'Summary', icon: UserRound, visibilityKey: 'summary' },
  { id: 'experience', label: 'Experience', icon: BriefcaseBusiness, visibilityKey: 'experience' },
  { id: 'education', label: 'Education', icon: GraduationCap, visibilityKey: 'education' },
  { id: 'skills', label: 'Skills', icon: Wrench, visibilityKey: 'skills' },
  { id: 'projects', label: 'Projects', icon: Lightbulb, visibilityKey: 'projects' },
  { id: 'publications', label: 'Publications', icon: BookOpen, visibilityKey: 'publications' },
  { id: 'research', label: 'Research', icon: FlaskConical, visibilityKey: 'research' },
  { id: 'languages', label: 'Languages', icon: Languages, visibilityKey: 'languages' },
  {
    id: 'certifications',
    label: 'Certifications',
    icon: FileBadge2,
    visibilityKey: 'certifications',
  },
  { id: 'references', label: 'References', icon: Users, visibilityKey: 'referrals' },
  { id: 'awards', label: 'Awards', icon: Award, visibilityKey: 'awards' },
  { id: 'volunteer', label: 'Volunteering', icon: HeartHandshake, visibilityKey: 'volunteer' },
  { id: 'interests', label: 'Interests', icon: Tag, visibilityKey: 'interests' },
  { id: 'custom', label: 'Custom sections', icon: Layers, visibilityKey: 'custom' },
];

const CONTENT_IDS = new Set<CVFormTab>([
  'photo',
  'header',
  'address',
  'summary',
  'experience',
  'education',
  'skills',
]);

const OPTIONAL_IDS = new Set<CVFormTab>(
  ITEMS.map((i) => i.id).filter((id) => !CONTENT_IDS.has(id))
);

function VisibilitySwitch({
  on,
  ariaLabel,
  disabled,
  onToggle,
}: {
  on: boolean;
  ariaLabel: string;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-disabled={disabled ?? false}
      aria-label={ariaLabel}
      disabled={disabled}
      tabIndex={disabled ? -1 : undefined}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) onToggle();
      }}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary-400)]',
        disabled ? 'cursor-not-allowed opacity-45' : 'cursor-pointer',
        on ? 'bg-[var(--color-primary-400)]' : 'bg-[var(--color-border)]'
      )}
    >
      <span
        className={cn(
          'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-transform duration-200',
          on ? 'translate-x-4' : 'translate-x-0.5'
        )}
      />
    </button>
  );
}

function CollapsibleNavGroup({
  title,
  hint,
  defaultOpen,
  children,
}: {
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen !== false);

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left transition duration-200 hover:bg-[var(--color-hover-surface)]"
      >
        <span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-secondary)]">
            {title}
          </span>
          {hint ? (
            <span className="mt-0.5 block text-[10px] font-medium normal-case tracking-normal text-[var(--color-muted)]">
              {hint}
            </span>
          ) : null}
        </span>
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted)]" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted)]" />
        )}
      </button>
      {open ? <div className="space-y-0.5">{children}</div> : null}
    </div>
  );
}

interface SidebarProps {
  activeSection: CVFormTab;
  onSelect: (section: CVFormTab) => void;
  cvData?: CVData | null;
  sectionVisibility?: CVSectionVisibility;
  onSectionVisibilityChange?: (next: CVSectionVisibility) => void;
}

export function Sidebar({
  activeSection,
  onSelect,
  cvData,
  sectionVisibility,
  onSectionVisibilityChange,
}: SidebarProps) {
  const showToggles = Boolean(onSectionVisibilityChange);

  const contentItems = useMemo(() => ITEMS.filter((i) => CONTENT_IDS.has(i.id)), []);
  const optionalItems = useMemo(() => ITEMS.filter((i) => OPTIONAL_IDS.has(i.id)), []);

  const renderRow = (item: (typeof ITEMS)[number]) => {
    const Icon = item.icon;
    const active = item.id === activeSection;
    const vKey = item.visibilityKey;
    const exportVisible = vKey ? isCvSectionVisible(vKey, sectionVisibility) : true;
    const filled = vKey && cvData ? cvSectionHasFilledContent(vKey, cvData) : false;
    const switchOn = Boolean(vKey && filled && exportVisible);
    const toggleDisabled = Boolean(vKey && (!cvData || !filled));

    return (
      <div
        key={item.id}
        className={cn(
          'flex w-full items-center gap-1 rounded-xl px-1 py-0.5 transition duration-200 ease-out',
          active
            ? 'cv-sidebar-row-active bg-[var(--color-primary-100)]/80 shadow-sm ring-1 ring-[var(--color-primary-200)]/45'
            : 'hover:bg-[var(--color-hover-surface)]'
        )}
      >
        <button
          type="button"
          onClick={() => onSelect(item.id)}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-2 rounded-lg border-l-2 px-2 py-1.5 text-left text-sm font-semibold transition duration-200',
            active
              ? 'border-[var(--color-primary-400)] text-[var(--color-primary-400)]'
              : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className={cn(!switchOn && vKey && 'opacity-55')}>{item.label}</span>
        </button>
        {showToggles && vKey ? (
          <VisibilitySwitch
            on={switchOn}
            disabled={toggleDisabled}
            ariaLabel={
              toggleDisabled
                ? `${item.label}: add content here before it can appear on your CV.`
                : switchOn
                  ? `${item.label}: shown on CV. Click to hide from PDF and preview.`
                  : `${item.label}: hidden from PDF and preview. Click to show.`
            }
            onToggle={() =>
              onSectionVisibilityChange!(toggleCvSectionVisibility(sectionVisibility, vKey))
            }
          />
        ) : null}
      </div>
    );
  };

  return (
    <aside className="glass-panel w-full rounded-2xl border border-[var(--color-border)]/80 p-3 shadow-[0_8px_30px_rgba(0,0,0,0.06)] xl:sticky xl:top-[72px] xl:max-h-[calc(100vh-5.5rem)] xl:w-full xl:overflow-y-auto xl:overscroll-contain">
      <CollapsibleNavGroup title="Design & layout" hint="Template, colours, typography" defaultOpen>
        <button
          type="button"
          onClick={() => onSelect('design')}
          className={cn(
            'flex w-full items-center gap-2 rounded-xl border-l-2 px-3 py-2 text-left text-sm font-semibold transition duration-200',
            activeSection === 'design'
              ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-100)]/90 text-[var(--color-primary-500)] shadow-sm'
              : 'border-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-hover-surface)] hover:text-[var(--color-text-primary)]'
          )}
        >
          <Palette className="h-4 w-4 shrink-0" />
          <span>Design settings</span>
        </button>
      </CollapsibleNavGroup>

      <div className="my-3 border-t border-[var(--color-border)]/70" />

      <CollapsibleNavGroup
        title="Content"
        hint="Core sections recruiters scan first"
        defaultOpen
      >
        {contentItems.map(renderRow)}
      </CollapsibleNavGroup>

      <div className="my-3 border-t border-[var(--color-border)]/70" />

      <CollapsibleNavGroup title="Optional sections" hint="Toggle visibility per section" defaultOpen>
        {optionalItems.map(renderRow)}
      </CollapsibleNavGroup>

      {showToggles ? (
        <p className="mt-4 px-2 text-[10px] leading-snug text-[var(--color-muted)]">
          Toggle off to hide from PDF and preview. Your data stays in the editor.
        </p>
      ) : null}
    </aside>
  );
}
