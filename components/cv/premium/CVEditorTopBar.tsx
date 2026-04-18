'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  ArrowLeft,
  Eye,
  LayoutGrid,
  Tags,
  Undo2,
  Redo2,
  Maximize2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export type CVEditorFocusMode = 'default' | 'editor' | 'preview';

export interface CVEditorTopBarProps {
  backHref: string;
  /** Short page label, e.g. "Core CV" / "Job CV" */
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  /** Center area on wide screens (e.g. core CV picker + actions). */
  centerSlot?: ReactNode;
  /** Optional second row under 60px bar (document switcher, etc.) */
  bottomRow?: ReactNode;
  /** Mini ATS score; click opens drawer (parent handles). */
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
  /** Core editor: preview panel collapsed toggle lives in preview; optional quick widen preview */
  trailingControls?: ReactNode;
}

function scoreTone(s: number) {
  if (s >= 80) return 'border-[var(--color-accent-mint)]/50 bg-[var(--color-accent-mint)]/10 text-[var(--color-accent-mint)]';
  if (s >= 50) return 'border-[var(--color-accent-gold)]/45 bg-[var(--color-accent-gold)]/10 text-[var(--color-accent-gold)]';
  return 'border-red-400/35 bg-red-500/10 text-red-600';
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
  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b border-[var(--color-border)]/80 bg-[var(--color-surface)]/92 backdrop-blur-xl',
        bottomRow ? '' : ''
      )}
    >
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
            centerSlot ? 'justify-start xl:justify-end' : 'justify-start xl:justify-end'
          )}
        >
          {atsScore !== null ? (
            <button
              type="button"
              onClick={onOpenAts}
              className={cn(
                'inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold tabular-nums transition hover:brightness-110',
                scoreTone(atsScore)
              )}
            >
              ATS
              <span>{atsScore}</span>
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

          <div className="flex items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-faint)] p-0.5">
            <button
              type="button"
              title="Default layout"
              aria-pressed={focusMode === 'default'}
              onClick={() => onFocusModeChange('default')}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-text-secondary)] transition',
                focusMode === 'default' &&
                  'bg-[var(--color-hover-surface-strong)] text-[var(--color-text-primary)] shadow-sm'
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Focus editor"
              aria-pressed={focusMode === 'editor'}
              onClick={() => onFocusModeChange('editor')}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-text-secondary)] transition',
                focusMode === 'editor' &&
                  'bg-[var(--color-hover-surface-strong)] text-[var(--color-text-primary)] shadow-sm'
              )}
            >
              <Maximize2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Preview only"
              aria-pressed={focusMode === 'preview'}
              onClick={() => onFocusModeChange('preview')}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-text-secondary)] transition',
                focusMode === 'preview' &&
                  'bg-[var(--color-hover-surface-strong)] text-[var(--color-text-primary)] shadow-sm'
              )}
            >
              <Eye className="h-4 w-4" />
            </button>
          </div>

          {trailingControls}

          {undoRedo ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                className="h-9"
                disabled={!undoRedo.canUndo}
                onClick={undoRedo.onUndo}
                icon={<Undo2 className="h-3.5 w-3.5" />}
                title="Undo (⌘Z)"
              >
                <span className="hidden lg:inline">Undo</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="h-9"
                disabled={!undoRedo.canRedo}
                onClick={undoRedo.onRedo}
                icon={<Redo2 className="h-3.5 w-3.5" />}
                title="Redo (⌘⇧Z)"
              >
                <span className="hidden lg:inline">Redo</span>
              </Button>
            </>
          ) : null}

          {secondaryAction ? (
            <Button
              variant="secondary"
              size="sm"
              className="h-9"
              loading={secondaryAction.loading}
              disabled={secondaryAction.disabled}
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          ) : null}

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

          {statusLine ? (
            <span className="text-[11px] font-medium text-[var(--color-text-secondary)]">{statusLine}</span>
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
