import { create } from 'zustand';

interface UIState {
  /** Mobile slide-down menu (top nav on small screens) */
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;

  /** Desktop sidebar collapse state */
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;

  /**
   * Href user tapped in the main nav — highlights immediately before the route updates.
   * Cleared when `pathname` matches or navigation settles.
   */
  pendingNavHref: string | null;
  setPendingNavHref: (href: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  mobileMenuOpen: false,
  setMobileMenuOpen: (mobileMenuOpen) => set({ mobileMenuOpen }),
  toggleMobileMenu: () => set((s) => ({ mobileMenuOpen: !s.mobileMenuOpen })),

  sidebarCollapsed: false,
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  pendingNavHref: null,
  setPendingNavHref: (pendingNavHref) => set({ pendingNavHref }),
}));
