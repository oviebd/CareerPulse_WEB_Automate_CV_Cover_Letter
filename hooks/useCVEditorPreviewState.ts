'use client';

import { useEffect, useState } from 'react';

function defaultPreviewVisible(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(min-width: 768px)').matches;
}

export function useCVEditorPreviewState() {
  const [previewVisible, setPreviewVisible] = useState(defaultPreviewVisible);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [previewCollapsed, setPreviewCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = () => {
      if (mq.matches) {
        setPreviewVisible(true);
        setMobilePreviewOpen(false);
        setMobileSidebarOpen(false);
      } else {
        setPreviewVisible(false);
      }
    };
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const togglePreview = () => {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
      setMobilePreviewOpen((v) => !v);
      return;
    }
    setPreviewVisible((v) => {
      const next = !v;
      if (next) setPreviewCollapsed(false);
      return next;
    });
  };

  return {
    previewVisible: previewVisible && !previewCollapsed,
    mobilePreviewOpen,
    previewCollapsed,
    setPreviewCollapsed,
    setMobilePreviewOpen,
    setMobileSidebarOpen,
    mobileSidebarOpen,
    togglePreview,
    isPreviewActive: mobilePreviewOpen || (previewVisible && !previewCollapsed),
  };
}
