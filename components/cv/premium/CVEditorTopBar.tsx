'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  Eye,
  LayoutGrid,
  Tags,
  Undo2,
  Redo2,
  Maximize2,
  MoreHorizontal,
  FileDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export type CVEditorFocusMode = 'default' | 'editor' | 'preview';

export interface CVEditorTopBarProps {
  backHref: string;
  title: string;
  subtitle?: string;
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
  };
  secondaryAction?: {
    label: string;
    loading?: boolean;
    disabled?: boolean;
    onClick: () => void;
  };
  statusLine?: ReactNode;
  focusMode: CVEditorFocusMode;
  onFocusModeChange: (mode: CVEditorFocusMode) => void;
  trailingControls?: ReactNode;
}

function scoreTone(s: number) {
  if (s >= 80) return 'border-[var(--color-accent-mint)]/35 bg-[var(--color-accent-mint)]/8 text-[var(--color-accent-mint)]';
  if (s >= 50) return 'border-[var(--color-accent-gold)]/35 bg-[var(--color-accent-gold)]/8 text-[var(--color-accent-gold)]';
  return 'border-red-400/35 bg-red-500/10 text-red-600';
}

function FocusModeMenu({
  focusMode,
  onFocusModeChange,
  onPick,
}: {
  focusMode: CVEditorFocusMode;
  onFocusModeChange: (mode: CVEditorFocusMode) => void;
  onPick?: () => void;
}) {
  const modes: { id: CVEditorFocusMode; label: string; icon: typeof LayoutGrid }[] = [
    { id: 'default', label: 'Default layout', icon: LayoutGrid },
    { id: 'editor', label: 'Focus editor', icon: Maximize2 },
    { id: 'preview', label: 'Preview only', icon: Eye },
  ];

  return (
    <div className="py-1">
      <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
        Layout
      </p>
      {modes.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          className={cn(
            'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--color-hover-surface)]',
            focusMode === id
              ? 'font-medium text-[var(--color-primary-500)]'
              : 'text-[var(--color-text-primary)]'
          )}
          onClick={() => {
            onFocusModeChange(id);
            onPick?.();
          }}
        >
          <Icon className="h-4 w-4 shrink-0" />
          {label}
        </button>
      ))}
    </div>
  );
}

export function CVEditorTopBar({
  backHref,
  title,
  subtitle,
  badge,
  centerSlot,
  bottomRow,
  atsScore,
  onOpenAts,
  keywords,
  undoRedo,
  primaryAction,
  secondaryAction,
  statusLine,
  focusMode,
  onFocusModeChange,
  trailingControls,
}: CVEditorTopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const hasOverflow =
    Boolean(undoRedo) || Boolean(secondaryAction) || true;

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
            ? 'grid-cols-1 xl:grid-cols-[minmax(0,1.05fr)_auto_minmax(0,1.15fr)] xl:items-center'
            : 'grid-cols-1 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center'
        )}
      >
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link
            href={backHref}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-control-bg)] text-[var(--color-text-primary)] transition duration-200 hover:bg-[var(--color-control-bg-hover)]"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
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
          </div>
        </div>

        {centerSlot ? (
          <div className="flex flex-wrap items-center justify-center gap-2 xl:justify-center">{centerSlot}</div>
        ) : null}

        <div
          className={cn(
            'flex flex-wrap items-center gap-1.5 sm:gap-2',
            'justify-start xl:justify-end'
          )}
        >
          {atsScore !== null ? (
            <button
              type="button"
              onClick={onOpenAts}
              className={cn(
                'inline-flex h-8 items-center gap-1 rounded-full border px-2.5 text-[10px] font-medium tabular-nums transition hover:brightness-110',
                scoreTone(atsScore)
              )}
            >
              ATS
              <span className="font-semibold">{atsScore}</span>
            </button>
          ) : null}

          {keywords?.show ? (
            <Button
              type="button"
              variant={keywords.open ? 'primary' : 'secondary'}
              size="sm"
              data-keyword-popover-trigger="true"
              className="h-9 shrink-0 gap-1.5 px-2.5 sm:px-3"
              onClick={keywords.onToggle}
              icon={<Tags className="h-3.5 w-3.5" />}
            >
              <span className="hidden sm:inline">Keywords</span>
              {typeof keywords.count === 'number' ? (
                <span className="font-mono text-[10px] opacity-90">{keywords.count}</span>
              ) : null}
            </Button>
          ) : null}

          {trailingControls}

          {primaryAction ? (
            <Button
              variant="primary"
              size="sm"
              className="h-9"
              loading={primaryAction.loading}
              disabled={primaryAction.disabled}
              onClick={primaryAction.onClick}
            >
              {primaryAction.label}
            </Button>
          ) : null}

          {hasOverflow ? (
            <div ref={menuRef} className="relative shrink-0">
              <button
                type="button"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                aria-label="More actions"
                onClick={() => setMenuOpen((v) => !v)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-control-bg)] text-[var(--color-text-secondary)] transition hover:bg-[var(--color-control-bg-hover)] hover:text-[var(--color-text-primary)]"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {menuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-[80] mt-2 min-w-[200px] overflow-hidden rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-surface)] py-1 shadow-lg"
                >
                  {undoRedo ? (
                    <div className="border-b border-[var(--color-border)]/60 py-1">
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
                  {secondaryAction ? (
                    <button
                      type="button"
                      role="menuitem"
                      disabled={secondaryAction.disabled || secondaryAction.loading}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--color-text-primary)] transition hover:bg-[var(--color-hover-surface)] disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={() => {
                        secondaryAction.onClick();
                        setMenuOpen(false);
                      }}
                    >
                      <FileDown className="h-4 w-4 shrink-0" />
                      {secondaryAction.loading ? 'Exporting…' : secondaryAction.label}
                    </button>
                  ) : null}
                  <FocusModeMenu
                    focusMode={focusMode}
                    onFocusModeChange={onFocusModeChange}
                    onPick={() => setMenuOpen(false)}
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {statusLine ? (
            <span className="hidden text-[11px] font-medium text-[var(--color-text-secondary)] sm:inline">
              {statusLine}
            </span>
          ) : null}
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
