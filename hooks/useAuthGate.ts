'use client';

import { useCallback, useState, createElement } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { NeedLoginModal } from '@/components/auth-gate/NeedLoginModal';

export function useAuthGate() {
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
  });

  return { requireAuth, authModal, openAuthModal: () => setOpen(true) };
}
