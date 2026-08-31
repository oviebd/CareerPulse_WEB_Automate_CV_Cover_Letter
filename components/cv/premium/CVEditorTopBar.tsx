'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  Eye,
  EyeOff,
  LayoutGrid,
  Tags,
  Undo2,
  Redo2,
  Maximize2,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { EditorIconButton } from '@/components/cv/premium/EditorIconButton';

export type CVEditorFocusMode = 'default' | 'editor' | 'preview';

export interface CVEditorTopBarProps {
  backHref: string;
  backLabel?: string;
  title: string;
  subtitle?: string;
  caption?: string;
  badge?: ReactNode;
  centerSlot?: ReactNode;
  bottomRow?: ReactNode;
  atsScore: number | null;
  onOpenAts: () => void;
  keywords?: {
    show: boolean;
    count?: number;
    open: boolean;
    onToggle: () => void;
  };
  undoRedo?: {
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
  };
  primaryAction?: {
    label: string;
    loading?: boolean;
    disabled?: boolean;
    onClick: () => void;
    highlight?: boolean;
    tooltip?: string;
  };
  previewToggle?: {
    visible: boolean;
    onToggle: () => void;
  };
  statusLine?: ReactNode;
  onRetrySave?: () => void;
  focusMode: CVEditorFocusMode;
  onFocusModeChange: (mode: CVEditorFocusMode) => void;
  trailingControls?: ReactNode;
  /** Extra items above Layout in the overflow menu. Receives close() to dismiss the menu. */
  moreMenuItems?: (close: () => void) => ReactNode;
}

function scoreTone(s: number) {
  if (s >= 80)
    return 'border-[var(--color-accent-mint)]/35 bg-[var(--color-accent-mint)]/8 text-[var(--color-accent-mint)]';
  if (s >= 50)
    return 'border-[var(--color-accent-gold)]/35 bg-[var(--color-accent-gold)]/8 text-[var(--color-accent-gold)]';
  return 'border-[var(--color-danger)]/35 bg-[var(--color-danger)]/10 text-[var(--color-danger)]';
}

const FOCUS_MODES: {
  id: CVEditorFocusMode;
  label: string;
  hint: string;
  icon: typeof LayoutGrid;
}[] = [
  {
    id: 'default',
    label: 'Default layout',
    hint: 'Sections, editor, and live preview together',
    icon: LayoutGrid,
  },
  {
    id: 'editor',
    label: 'Focus editor',
    hint: 'Hide the live preview and section list',
    icon: Maximize2,
  },
  {
    id: 'preview',
    label: 'Preview only',
    hint: 'Hide the form and section list; preview only',
    icon: Eye,
  },
];

function FocusModeMenu({
  focusMode,
  onFocusModeChange,
  onPick,
}: {
  focusMode: CVEditorFocusMode;
  onFocusModeChange: (mode: CVEditorFocusMode) => void;
  onPick?: () => void;
}) {
  return (
    <div className="py-1">
      <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
        Layout
      </p>
      {FOCUS_MODES.map(({ id, label, hint, icon: Icon }) => (
        <button
          key={id}
          type="button"
          className={cn(
            'flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-[var(--color-hover-surface)]',
            focusMode === id
              ? 'font-medium text-[var(--color-primary-500)]'
              : 'text-[var(--color-text-primary)]'
          )}
          onClick={() => {
            onFocusModeChange(id);
            onPick?.();
          }}
        >
          <Icon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <span className="block text-sm">{label}</span>
            <span className="block text-[11px] font-normal text-[var(--color-muted)]">{hint}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

export function CVEditorTopBar({
  backHref,
  backLabel = 'Back to Documents',
  title,
  subtitle,
  caption,
  badge,
  centerSlot,
  bottomRow,
  atsScore,
  onOpenAts,
  keywords,
  undoRedo,
  primaryAction,
  previewToggle,
  statusLine,
  onRetrySave,
  focusMode,
  onFocusModeChange,
  trailingControls,
  moreMenuItems,
}: CVEditorTopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const el = menuRef.current;
      const target = e.target as Node | null;
      if (el && target && !el.contains(target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)]/80 bg-[var(--color-surface)]/92 backdrop-blur-xl">
      <div
        className={cn(
          'grid min-h-[56px] w-full gap-2 px-3 py-2 sm:gap-3 sm:px-4',
          centerSlot
            ? 'grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_auto_minmax(0,1.15fr)] lg:items-center'
            : 'grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center'
        )}
      >
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Tooltip content={backLabel}>
            <Link
              href={backHref}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-control-bg)] text-[var(--color-text-primary)] transition duration-200 hover:bg-[var(--color-control-bg-hover)]"
              aria-label={backLabel}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Tooltip>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate font-display text-base font-semibold text-[var(--color-text-primary)] sm:text-lg">
                {title}
              </h1>
              {badge}
            </div>
            {subtitle ? (
              <p className="truncate text-xs font-medium text-[var(--color-text-secondary)] sm:text-sm">
                {subtitle}
              </p>
            ) : null}
            {caption ? (
              <p className="truncate text-[11px] text-[var(--color-muted)]">{caption}</p>
            ) : null}
          </div>
        </div>

        {centerSlot ? (
          <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-center">
            {centerSlot}
          </div>
        ) : null}

        <div className={cn('flex flex-wrap items-center gap-1.5 sm:gap-2', 'justify-start lg:justify-end')}>
          {statusLine ? (
            <span className="order-first w-full text-[11px] font-medium text-[var(--color-text-secondary)] sm:order-none sm:w-auto lg:mr-1">
              {statusLine}
              {onRetrySave ? (
                <button
                  type="button"
                  className="ml-1 font-semibold text-[var(--color-primary-500)] underline-offset-2 hover:underline"
                  onClick={onRetrySave}
                >
                  Retry
                </button>
              ) : null}
            </span>
          ) : null}

          {atsScore !== null ? (
            <Tooltip content="Applicant Tracking System score — how well this CV is likely to parse. Click for tips.">
              <button
                type="button"
                onClick={onOpenAts}
                className={cn(
                  'inline-flex h-8 items-center gap-1 rounded-full border px-2.5 text-[10px] font-medium tabular-nums transition hover:brightness-110',
                  scoreTone(atsScore)
                )}
                aria-label={`ATS score ${atsScore}. Open tips.`}
              >
                ATS score
                <span className="font-semibold">{atsScore}</span>
                <ChevronDown className="h-3 w-3 opacity-80" aria-hidden />
              </button>
            </Tooltip>
          ) : null}

          {keywords?.show ? (
            <Tooltip content="Keywords from the job description. Click to see which ones appear in this CV.">
              <Button
                type="button"
                variant={keywords.open ? 'primary' : 'secondary'}
                size="sm"
                data-keyword-popover-trigger="true"
                className="h-9 shrink-0 gap-1.5 px-2.5 sm:px-3"
                onClick={keywords.onToggle}
                aria-label="Job keywords"
                aria-pressed={keywords.open}
                icon={<Tags className="h-3.5 w-3.5" />}
              >
                <span className="hidden sm:inline">Job keywords</span>
                {typeof keywords.count === 'number' ? (
                  <span className="font-mono text-[10px] opacity-90">{keywords.count}</span>
                ) : null}
              </Button>
            </Tooltip>
          ) : null}

          {undoRedo ? (
            <div className="hidden items-center gap-0.5 sm:flex">
              <EditorIconButton
                label="Undo"
                tooltip="Undo last change"
                disabled={!undoRedo.canUndo}
                onClick={undoRedo.onUndo}
              >
                <Undo2 className="h-4 w-4" />
              </EditorIconButton>
              <EditorIconButton
                label="Redo"
                tooltip="Redo last change"
                disabled={!undoRedo.canRedo}
                onClick={undoRedo.onRedo}
              >
                <Redo2 className="h-4 w-4" />
              </EditorIconButton>
            </div>
          ) : null}

          {previewToggle ? (
            <EditorIconButton
              label={previewToggle.visible ? 'Hide preview' : 'Show preview'}
              tooltip={
                previewToggle.visible
                  ? 'Hide the live preview pane'
                  : 'Show the live preview pane'
              }
              pressed={previewToggle.visible}
              onClick={previewToggle.onToggle}
            >
              {previewToggle.visible ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </EditorIconButton>
          ) : null}

          {trailingControls}

          {primaryAction ? (
            <Tooltip
              content={
                primaryAction.tooltip ?? 'Saves this CV to your CareerPulse account.'
              }
            >
              <Button
                variant="primary"
                size="sm"
                className={cn('h-9', primaryAction.highlight && 'ring-2 ring-[var(--color-primary-300)]')}
                loading={primaryAction.loading}
                disabled={primaryAction.disabled}
                onClick={primaryAction.onClick}
              >
                {primaryAction.label}
              </Button>
            </Tooltip>
          ) : null}

          <div ref={menuRef} className="relative shrink-0">
            <EditorIconButton
              label="More actions"
              tooltip={menuOpen ? '' : 'Layout and extra actions'}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <MoreHorizontal className="h-4 w-4" />
            </EditorIconButton>
            {menuOpen ? (
              <div
                role="menu"
                className="absolute right-0 top-full z-[80] mt-2 min-w-[220px] overflow-hidden rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-surface)] py-1 shadow-lg"
              >
                {undoRedo ? (
                  <div className="border-b border-[var(--color-border)]/60 py-1 sm:hidden">
                    <button
                      type="button"
                      role="menuitem"
                      disabled={!undoRedo.canUndo}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--color-text-primary)] transition hover:bg-[var(--color-hover-surface)] disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={() => {
                        undoRedo.onUndo();
                        setMenuOpen(false);
                      }}
                    >
                      <Undo2 className="h-4 w-4 shrink-0" />
                      Undo
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      disabled={!undoRedo.canRedo}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--color-text-primary)] transition hover:bg-[var(--color-hover-surface)] disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={() => {
                        undoRedo.onRedo();
                        setMenuOpen(false);
                      }}
                    >
                      <Redo2 className="h-4 w-4 shrink-0" />
                      Redo
                    </button>
                  </div>
                ) : null}
                {moreMenuItems ? (
                  <div className="border-b border-[var(--color-border)]/60 py-1">
                    {moreMenuItems(() => setMenuOpen(false))}
                  </div>
                ) : null}
                <FocusModeMenu
                  focusMode={focusMode}
                  onFocusModeChange={onFocusModeChange}
                  onPick={() => setMenuOpen(false)}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
      {bottomRow ? (
        <div className="border-t border-[var(--color-border)]/60 bg-[var(--color-surface)]/95 px-3 py-2 sm:px-4">
          {bottomRow}
        </div>
      ) : null}
    </header>
  );
}
