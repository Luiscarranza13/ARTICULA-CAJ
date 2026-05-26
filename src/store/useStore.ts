import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Notificacion, Testimonio, SiteConfig } from '../types';
import { mockNotificaciones, mockTestimonios } from '../data/mockData';

const DEFAULT_SITE_CONFIG: SiteConfig = {
  actoresCount: 3847,
  productosCount: 1234,
  acuerdosCount: 289,
  ventasImpacto: 124,
  telefono: '+51 076 365 000',
  email: 'info@articulacaj.pe',
  direccion: 'Cajamarca, Perú',
};

interface AuthSlice {
  user: User | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  login: (user: User) => void;
  logout: () => void;
  setAuthLoading: (loading: boolean) => void;
  updateUser: (data: Partial<User>) => void;
}

interface UISlice {
  darkMode: boolean;
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  toggleDarkMode: () => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapsed: () => void;
}

interface NotifSlice {
  notifications: Notificacion[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllRead: () => void;
}

interface TestimoniosSlice {
  testimonios: Testimonio[];
  addTestimonio: (t: Omit<Testimonio, 'id' | 'createdAt'>) => void;
  updateTestimonio: (id: string, data: Partial<Testimonio>) => void;
  deleteTestimonio: (id: string) => void;
}

interface SiteConfigSlice {
  siteConfig: SiteConfig;
  updateSiteConfig: (data: Partial<SiteConfig>) => void;
}

interface LuisModeSlice {
  luisMode: boolean;
  toggleLuisMode: () => void;
}

type Store = AuthSlice & UISlice & NotifSlice & TestimoniosSlice & SiteConfigSlice & LuisModeSlice;

export const useStore = create<Store>()(
  persist(
    (set) => ({
      // Auth
      user: null,
      isAuthenticated: false,
      isAuthLoading: false,
      login: (user) => set({ user, isAuthenticated: true, isAuthLoading: false }),
      logout: () => set({ user: null, isAuthenticated: false, isAuthLoading: false }),
      setAuthLoading: (loading) => set({ isAuthLoading: loading }),
      updateUser: (data) => set((s) => ({ user: s.user ? { ...s.user, ...data } : null })),

      // UI
      darkMode: false,
      sidebarOpen: true,
      sidebarCollapsed: false,
      toggleDarkMode: () => set((s) => {
        const next = !s.darkMode;
        if (next) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
        return { darkMode: next };
      }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebarCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      // Notifications
      notifications: mockNotificaciones,
      unreadCount: mockNotificaciones.filter((n) => !n.leida).length,
      markAsRead: (id) =>
        set((s) => {
          const notifications = s.notifications.map((n) => n.id === id ? { ...n, leida: true } : n);
          return { notifications, unreadCount: notifications.filter((n) => !n.leida).length };
        }),
      markAllRead: () =>
        set((s) => ({
          notifications: s.notifications.map((n) => ({ ...n, leida: true })),
          unreadCount: 0,
        })),

      // Testimonios
      testimonios: mockTestimonios,
      addTestimonio: (t) =>
        set((s) => ({
          testimonios: [
            ...s.testimonios,
            { ...t, id: `t-${Date.now()}`, createdAt: new Date().toISOString() },
          ],
        })),
      updateTestimonio: (id, data) =>
        set((s) => ({
          testimonios: s.testimonios.map((t) => t.id === id ? { ...t, ...data } : t),
        })),
      deleteTestimonio: (id) =>
        set((s) => ({ testimonios: s.testimonios.filter((t) => t.id !== id) })),

      // Site Config
      siteConfig: DEFAULT_SITE_CONFIG,
      updateSiteConfig: (data) =>
        set((s) => ({ siteConfig: { ...s.siteConfig, ...data } })),

      // Luis Mode
      luisMode: false,
      toggleLuisMode: () => set((s) => ({ luisMode: !s.luisMode })),
    }),
    {
      name: 'articula-caj-v2',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        darkMode: state.darkMode,
        sidebarCollapsed: state.sidebarCollapsed,
        testimonios: state.testimonios,
        siteConfig: state.siteConfig,
        luisMode: state.luisMode,
      }),
    }
  )
);
