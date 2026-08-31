'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { ComponentType } from 'react';
import type { CVFormTab } from '@/components/cv/CVFormFields';
import type { CVData, CVSectionVisibility, CVSectionVisibilityKey } from '@/types';
import { isCvSectionVisible, toggleCvSectionVisibility } from '@/lib/cv-section-visibility';
import {
  cvCompletionPercent,
  cvCompletionCounts,
  cvFormTabHasFilledContent,
  cvSectionHasFilledContent,
} from '@/lib/cv-sidebar-content';
import { sectionHint } from '@/lib/cv-editor-flow';
import { Tooltip } from '@/components/ui/tooltip';
import {
  Award,
  BookOpen,
  BriefcaseBusiness,
  Camera,
  Check,
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
  Search,
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

const CORE_SECTION_IDS: CVFormTab[] = [
  'photo',
  'header',
  'address',
  'summary',
  'experience',
  'education',
  'skills',
  'projects',
];

const OPTIONAL_SECTION_IDS: CVFormTab[] = [
  'publications',
  'research',
  'languages',
  'certifications',
  'references',
  'awards',
  'volunteer',
  'interests',
  'custom',
];

const ITEM_BY_ID = new Map(ITEMS.map((i) => [i.id, i]));

function CompletionDot({ complete }: { complete: boolean }) {
  const label = complete ? 'Has content' : 'Still empty';
  if (!complete) {
    return (
      <Tooltip content={label}>
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-border)]"
          aria-label={label}
        />
      </Tooltip>
    );
  }
  return (
    <Tooltip content={label}>
      <span
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-mint)]/15 text-[var(--color-accent-mint)]"
        aria-label={label}
      >
        <Check className="h-2.5 w-2.5" strokeWidth={3} />
      </span>
    </Tooltip>
  );
}

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
          'pointer-events-none block h-4 w-4 rounded-full bg-[var(--color-surface)] shadow-sm ring-1 ring-[var(--color-border)] transition-transform duration-200',
          on ? 'translate-x-4' : 'translate-x-0.5'
        )}
      />
    </button>
  );
}

interface SidebarProps {
  activeSection: CVFormTab;
  onSelect: (section: CVFormTab) => void;
  cvData?: CVData | null;
  sectionVisibility?: CVSectionVisibility;
  onSectionVisibilityChange?: (next: CVSectionVisibility) => void;
  /** Mobile drawer mode — used when opened from bottom bar. */
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({
  activeSection,
  onSelect,
  cvData,
  sectionVisibility,
  onSectionVisibilityChange,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const [search, setSearch] = useState('');
  const [showOptional, setShowOptional] = useState(false);
  const showToggles = Boolean(onSectionVisibilityChange);

  const completionPct = useMemo(
    () => (cvData ? cvCompletionPercent(cvData) : 0),
    [cvData]
  );
  const completionCounts = useMemo(
    () => (cvData ? cvCompletionCounts(cvData) : { filled: 0, total: 0 }),
    [cvData]
  );

  const query = search.trim().toLowerCase();
  const isSearching = query.length > 0;

  const filteredIds = useMemo(() => {
    if (!isSearching) return null;
    return ITEMS.filter((item) => item.label.toLowerCase().includes(query)).map((i) => i.id);
  }, [isSearching, query]);

  const visibleCoreIds = useMemo(() => {
    if (filteredIds) return filteredIds.filter((id) => CORE_SECTION_IDS.includes(id));
    return CORE_SECTION_IDS;
  }, [filteredIds]);

  const visibleOptionalIds = useMemo(() => {
    if (filteredIds) return filteredIds.filter((id) => OPTIONAL_SECTION_IDS.includes(id));
    return showOptional || isSearching ? OPTIONAL_SECTION_IDS : [];
  }, [filteredIds, showOptional, isSearching]);

  const handleSelect = (section: CVFormTab) => {
    onSelect(section);
    onMobileClose?.();
  };

  const renderRow = (item: (typeof ITEMS)[number]) => {
    const Icon = item.icon;
    const active = item.id === activeSection;
    const vKey = item.visibilityKey;
    const exportVisible = vKey ? isCvSectionVisible(vKey, sectionVisibility) : true;
    const filled =
      cvData && vKey
        ? cvSectionHasFilledContent(vKey, cvData)
        : cvData
          ? cvFormTabHasFilledContent(item.id, cvData)
          : false;
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
          onClick={() => handleSelect(item.id)}
          title={sectionHint(item.id).hint}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-2 rounded-lg border-l-2 px-2 py-1.5 text-left text-sm font-semibold transition duration-200',
            active
              ? 'border-[var(--color-primary-400)] text-[var(--color-primary-400)]'
              : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          )}
        >
          <CompletionDot complete={filled} />
          <Icon className="h-4 w-4 shrink-0" />
          <span className={cn('truncate', !switchOn && vKey && 'opacity-55')}>{item.label}</span>
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

  const sidebarContent = (
    <>
      <div className="mb-3 px-1">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-muted)]" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sections…"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-control-bg)] py-2 pl-8 pr-3 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--color-focus-ring)]"
            aria-label="Search CV sections"
          />
        </div>
      </div>

      {cvData ? (
        <div className="mb-3 px-2">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[10px] font-medium text-[var(--color-muted)]">
              <span className="block">CV progress</span>
              <span className="mt-0.5 block text-[9px] font-normal text-[var(--color-muted)]/90">
                {completionCounts.filled} of {completionCounts.total} core sections filled
              </span>
            </span>
            <span className="shrink-0 tabular-nums text-[10px] font-medium text-[var(--color-accent-mint)]">
              {completionPct}%
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--color-progress-track)]">
            <div
              className="h-full rounded-full bg-[var(--color-accent-mint)] transition-all duration-300"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className="space-y-1">
        <p className="px-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-secondary)]">
          Design & layout
        </p>
        <button
          type="button"
          onClick={() => handleSelect('design')}
          title={sectionHint('design').hint}
          className={cn(
            'flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-semibold transition duration-200',
            activeSection === 'design'
              ? 'border-[var(--color-primary-400)] bg-[var(--color-primary-100)]/90 text-[var(--color-primary-500)] shadow-sm'
              : 'border-[var(--color-border)] bg-[var(--color-control-bg)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-hover-surface)] hover:text-[var(--color-text-primary)]'
          )}
        >
          <Palette className="h-4 w-4 shrink-0" />
          <span>Layout & style</span>
        </button>
      </div>

      <div className="my-3 border-t border-[var(--color-border)]/70" />

      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2 px-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-secondary)]">
            Core sections
          </p>
          {showToggles ? (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
              On PDF
            </span>
          ) : null}
        </div>
        {visibleCoreIds.map((id) => {
          const item = ITEM_BY_ID.get(id);
          return item ? renderRow(item) : null;
        })}
      </div>

      {!isSearching && visibleOptionalIds.length === 0 ? (
        <button
          type="button"
          onClick={() => setShowOptional(true)}
          className="mt-2 flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-xs font-semibold text-[var(--color-primary-500)] transition hover:bg-[var(--color-hover-surface)]"
        >
          <span>Show more sections</span>
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      ) : null}

      {visibleOptionalIds.length > 0 ? (
        <div className="mt-2 space-y-1">
          <div className="flex items-center justify-between gap-2 px-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-secondary)]">
              {isSearching ? 'More sections' : 'Optional sections'}
            </p>
            {showToggles ? (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                On PDF
              </span>
            ) : null}
          </div>
          {visibleOptionalIds.map((id) => {
            const item = ITEM_BY_ID.get(id);
            return item ? renderRow(item) : null;
          })}
          {!isSearching && showOptional ? (
            <button
              type="button"
              onClick={() => setShowOptional(false)}
              className="flex w-full items-center gap-1 px-2 py-1.5 text-xs font-medium text-[var(--color-muted)] hover:text-[var(--color-text-secondary)]"
            >
              <ChevronRight className="h-3 w-3 rotate-90" />
              Show fewer
            </button>
          ) : null}
        </div>
      ) : null}

      {isSearching && visibleCoreIds.length === 0 && visibleOptionalIds.length === 0 ? (
        <p className="px-2 py-4 text-center text-xs text-[var(--color-muted)]">No sections match</p>
      ) : null}

      {showToggles ? (
        <p className="mt-4 px-2 text-[10px] leading-snug text-[var(--color-muted)]">
          Toggle off to hide from PDF and preview. Your answers stay here.
        </p>
      ) : null}
    </>
  );

  if (mobileOpen !== undefined) {
    return (
      <>
        {mobileOpen ? (
          <div
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={onMobileClose}
            aria-hidden
          />
        ) : null}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex w-[min(100vw-2rem,280px)] flex-col overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-xl transition-transform duration-300 md:hidden',
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">Sections</p>
            <button
              type="button"
              onClick={onMobileClose}
              className="rounded-lg px-2 py-1 text-xs font-medium text-[var(--color-muted)] hover:bg-[var(--color-hover-surface)]"
            >
              Close
            </button>
          </div>
          {sidebarContent}
        </aside>
      </>
    );
  }

  return (
    <aside className="glass-panel w-full rounded-2xl border border-[var(--color-border)]/80 p-3 shadow-[var(--shadow-card)] md:sticky md:top-[72px] md:max-h-[calc(100vh-5.5rem)] md:w-full md:overflow-y-auto md:overscroll-contain">
      {sidebarContent}
    </aside>
  );
}
