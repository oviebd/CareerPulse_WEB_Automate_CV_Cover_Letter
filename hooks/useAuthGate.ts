'use client';

import { useCallback, useState, createElement } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { NeedLoginModal } from '@/components/auth-gate/NeedLoginModal';
import type { CVEditorState } from '@/lib/cv-editor-state';

export function useAuthGate(guestStateForOauth: CVEditorState | null) {
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);

  const requireAuth = useCallback(
    (fn: () => void | Promise<void>) => {
      return () => {
        if (user) {
          void fn();
          return;
        }
        setOpen(true);
      };
    },
    [user]
  );

  const authModal = createElement(NeedLoginModal, {
    open,
    onClose: () => setOpen(false),
    guestStateForOauth,
  });

  return { requireAuth, authModal, openAuthModal: () => setOpen(true) };
}
