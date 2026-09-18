import { create } from 'zustand';

export type GoPremiumFeature = 'interview' | 'export' | 'template' | 'docx';

interface UIState {
  /** Mobile slide-down menu (top nav on small screens) */
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;

  /** Desktop sidebar collapse state */
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;

  goPremiumFeature: GoPremiumFeature | null;
  openGoPremium: (feature: GoPremiumFeature) => void;
  closeGoPremium: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  mobileMenuOpen: false,
  setMobileMenuOpen: (mobileMenuOpen) => set({ mobileMenuOpen }),
  toggleMobileMenu: () => set((s) => ({ mobileMenuOpen: !s.mobileMenuOpen })),

  sidebarCollapsed: false,
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  goPremiumFeature: null,
  openGoPremium: (goPremiumFeature) => set({ goPremiumFeature }),
  closeGoPremium: () => set({ goPremiumFeature: null }),
}));
