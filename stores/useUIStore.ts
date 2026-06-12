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

  /** V3: skill proficiency ratings hidden by default */
  showSkillProficiency: boolean;
  setShowSkillProficiency: (show: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  mobileMenuOpen: false,
  setMobileMenuOpen: (mobileMenuOpen) => set({ mobileMenuOpen }),
  toggleMobileMenu: () => set((s) => ({ mobileMenuOpen: !s.mobileMenuOpen })),

  sidebarCollapsed: false,
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  showSkillProficiency: false,
  setShowSkillProficiency: (showSkillProficiency) => set({ showSkillProficiency }),
}));
