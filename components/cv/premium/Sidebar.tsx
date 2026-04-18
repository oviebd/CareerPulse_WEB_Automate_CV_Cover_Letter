'use client';

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
  Sparkles,
  Tag,
  UserRound,
  Users,
  Wrench,
} from 'lucide-react';

const ITEMS: Array<{
  id: CVFormTab;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Maps editor row to PDF/preview visibility; omitted where the model has no key (e.g. Header contact block). */
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

interface SidebarProps {
  activeSection: CVFormTab;
  onSelect: (section: CVFormTab) => void;
  /** Used to reflect whether each section has data — empty sections show the toggle off until filled. */
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

  return (
    <aside className="glass-panel w-full rounded-card border border-[var(--color-border)] p-3 shadow-sm xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:w-64 xl:overflow-y-auto">
      <div className="mb-4 space-y-4 border-b border-[var(--color-border)] px-2 py-3">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-[var(--color-primary-100)] p-1.5 text-[var(--color-primary-400)]">
            <Sparkles className="h-4 w-4" />
          </span>
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">CV Builder Pro</p>
        </div>
      </div>

      <div className="mb-6 space-y-1 px-1">
        <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)]">
          Design & Layout
        </p>
        <button
          type="button"
          onClick={() => onSelect('design')}
          className={cn(
            'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition duration-200',
            activeSection === 'design'
              ? 'bg-[var(--color-primary-100)] font-medium text-[var(--color-primary-400)]'
              : 'text-[var(--color-muted)] hover:bg-white/[0.04] hover:text-[var(--color-text-primary)]'
          )}
        >
          <Palette className="h-4 w-4 shrink-0" />
          <span>Design Settings</span>
        </button>
      </div>

      <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)]">
        CV Sections
      </p>
      {showToggles ? (
        <p className="mb-2 px-3 text-[10px] leading-snug text-[var(--color-muted)]">
          Toggle off to hide from PDF and preview. Your data stays here.
        </p>
      ) : null}

      <nav className="space-y-1">
        {ITEMS.map((item) => {
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
                'flex w-full items-center gap-1 rounded-xl px-1 py-0.5 transition duration-200',
                active ? 'bg-[var(--color-primary-100)]/90' : 'hover:bg-white/[0.04]'
              )}
            >
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                className={cn(
                  'flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition duration-200',
                  active
                    ? 'font-medium text-[var(--color-primary-400)]'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-text-primary)]'
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
                    onSectionVisibilityChange!(
                      toggleCvSectionVisibility(sectionVisibility, vKey)
                    )
                  }
                />
              ) : null}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
