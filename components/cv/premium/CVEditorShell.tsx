'use client';

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { CVEditorFocusMode } from '@/components/cv/premium/CVEditorTopBar';
import type { CVFormTab } from '@/components/cv/CVFormFields';
import type { CVData, CVSectionVisibility } from '@/types';
import { Sidebar } from '@/components/cv/premium/Sidebar';
import { PreviewPanel } from '@/components/cv/premium/PreviewPanel';
import { CVEditorMobileBar } from '@/components/cv/premium/CVEditorMobileBar';
import { useCVEditorPreviewState } from '@/hooks/useCVEditorPreviewState';

export type CVEditorPreviewControl = ReturnType<typeof useCVEditorPreviewState>;

export interface CVEditorShellPreviewProps {
  previewSrc: string;
  previewBusy: boolean;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  currentPage: number;
  onPageChange: (page: number) => void;
  footerSlot?: ReactNode;
}

export interface CVEditorShellProps {
  focusMode: CVEditorFocusMode;
  editorTab: CVFormTab;
  onEditorTabChange: (tab: CVFormTab) => void;
  cvData: CVData;
  onSectionVisibilityChange?: (next: CVSectionVisibility) => void;
  editorCanvas: ReactNode;
  preview: CVEditorShellPreviewProps;
  previewControl: CVEditorPreviewControl;
  beforeGrid?: ReactNode;
  mobileBar: {
    primaryLabel: string;
    primaryLoading?: boolean;
    primaryDisabled?: boolean;
    onPrimaryClick: () => void;
    leftSlot?: ReactNode;
  };
  className?: string;
}

export function CVEditorShell({
  focusMode,
  editorTab,
  onEditorTabChange,
  cvData,
  onSectionVisibilityChange,
  editorCanvas,
  preview,
  previewControl,
  beforeGrid,
  mobileBar,
  className,
}: CVEditorShellProps) {
  const {
    previewVisible,
    mobilePreviewOpen,
    previewCollapsed,
    setPreviewCollapsed,
    setMobilePreviewOpen,
    mobileSidebarOpen,
    setMobileSidebarOpen,
    togglePreview,
    isPreviewActive,
  } = previewControl;

  const showSidebar = focusMode !== 'preview' && focusMode === 'default';
  const showEditor = focusMode !== 'preview';
  const showDesktopPreview = focusMode !== 'editor' && previewVisible;

  const previewProps = {
    previewSrc: preview.previewSrc,
    previewBusy: preview.previewBusy,
    zoom: preview.zoom,
    onZoomChange: preview.onZoomChange,
    currentPage: preview.currentPage,
    onPageChange: preview.onPageChange,
    footerSlot: preview.footerSlot,
  };

  return (
    <div className={cn('relative mt-4 px-1 sm:px-0', className)}>
      {beforeGrid}

      <div
        className={cn(
          'grid gap-4',
          focusMode === 'default' &&
            showDesktopPreview &&
            'md:grid-cols-[minmax(200px,0.22fr)_minmax(0,1fr)_minmax(320px,0.42fr)]',
          focusMode === 'default' &&
            !showDesktopPreview &&
            'md:grid-cols-[minmax(200px,0.24fr)_minmax(0,1fr)]',
          (focusMode === 'editor' || focusMode === 'preview') && 'grid-cols-1'
        )}
      >
        {showSidebar ? (
          <div className="hidden md:block">
            <Sidebar
              activeSection={editorTab}
              onSelect={onEditorTabChange}
              cvData={cvData}
              sectionVisibility={cvData.sectionVisibility}
              onSectionVisibilityChange={onSectionVisibilityChange}
            />
          </div>
        ) : null}

        {showEditor ? (
          <div
            className={cn(
              'min-w-0 space-y-3',
              focusMode === 'default' &&
                showDesktopPreview &&
                'md:border-r md:border-[var(--color-border)] md:pr-3'
            )}
          >
            {editorCanvas}
          </div>
        ) : null}

        {focusMode !== 'editor' && (showDesktopPreview || focusMode === 'preview') ? (
          <div className={cn('min-w-0 space-y-3', focusMode === 'default' && 'hidden md:block')}>
            <PreviewPanel
              {...previewProps}
              collapsed={focusMode === 'default' ? previewCollapsed : false}
              onToggleCollapse={
                focusMode === 'default' ? () => setPreviewCollapsed((c) => !c) : undefined
              }
              desktopOnly
            />
          </div>
        ) : null}
      </div>

      <Sidebar
        activeSection={editorTab}
        onSelect={onEditorTabChange}
        cvData={cvData}
        sectionVisibility={cvData.sectionVisibility}
        onSectionVisibilityChange={onSectionVisibilityChange}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <PreviewPanel
        {...previewProps}
        mobileOnly
        mobileSheetOpen={mobilePreviewOpen}
        onMobileSheetClose={() => setMobilePreviewOpen(false)}
      />

      <CVEditorMobileBar
        leftSlot={mobileBar.leftSlot}
        primaryLabel={mobileBar.primaryLabel}
        primaryLoading={mobileBar.primaryLoading}
        primaryDisabled={mobileBar.primaryDisabled}
        onPrimaryClick={mobileBar.onPrimaryClick}
        onSectionsClick={() => setMobileSidebarOpen(true)}
        onPreviewClick={togglePreview}
        previewActive={isPreviewActive}
      />
    </div>
  );
}
