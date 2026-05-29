import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Notificacion, Testimonio, SiteConfig } from '../types';
import { mockNotificaciones, mockTestimonios } from '../data/mockData';
import {
  DEFAULT_SITE_CONFIG,
  createTestimonioRemote,
  deleteTestimonioRemote,
  fetchSiteContent,
  updateSiteConfigRemote,
  updateTestimonioRemote,
} from '../lib/siteContent';

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
  contentLoading: boolean;
  loadSiteContent: () => Promise<void>;
  addTestimonio: (t: Omit<Testimonio, 'id' | 'createdAt'>) => Promise<void>;
  updateTestimonio: (id: string, data: Partial<Testimonio>) => Promise<void>;
  deleteTestimonio: (id: string) => Promise<void>;
}

interface SiteConfigSlice {
  siteConfig: SiteConfig;
  updateSiteConfig: (data: Partial<SiteConfig>) => Promise<void>;
}

interface LuisModeSlice {
  luisMode: boolean;
  toggleLuisMode: () => void;
}

type Store = AuthSlice & UISlice & NotifSlice & TestimoniosSlice & SiteConfigSlice & LuisModeSlice;

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isAuthLoading: false,
      login: (user) => set({ user, isAuthenticated: true, isAuthLoading: false }),
      logout: () => set({ user: null, isAuthenticated: false, isAuthLoading: false }),
      setAuthLoading: (loading) => set({ isAuthLoading: loading }),
      updateUser: (data) => set((s) => ({ user: s.user ? { ...s.user, ...data } : null })),

      darkMode: false,
      sidebarOpen: true,
      sidebarCollapsed: false,
      toggleDarkMode: () => set((s) => {
        const next = !s.darkMode;
        document.documentElement.classList.toggle('dark', next);
        return { darkMode: next };
      }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebarCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

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

      testimonios: mockTestimonios,
      contentLoading: false,
      loadSiteContent: async () => {
        set({ contentLoading: true });
        try {
          const content = await fetchSiteContent(get().testimonios);
          set({ testimonios: content.testimonios, siteConfig: content.siteConfig });
        } catch (error) {
          console.warn('No se pudo cargar el contenido del sitio:', error);
        } finally {
          set({ contentLoading: false });
        }
      },
      addTestimonio: async (t) => {
        const created = await createTestimonioRemote(t);
        set((s) => ({ testimonios: [...s.testimonios, created] }));
      },
      updateTestimonio: async (id, data) => {
        await updateTestimonioRemote(id, data);
        set((s) => ({
          testimonios: s.testimonios.map((t) => t.id === id ? { ...t, ...data } : t),
        }));
      },
      deleteTestimonio: async (id) => {
        await deleteTestimonioRemote(id);
        set((s) => ({ testimonios: s.testimonios.filter((t) => t.id !== id) }));
      },

      siteConfig: DEFAULT_SITE_CONFIG,
      updateSiteConfig: async (data) => {
        const next = { ...get().siteConfig, ...data };
        await updateSiteConfigRemote(next);
        set({ siteConfig: next });
      },

      luisMode: false,
      toggleLuisMode: () => set((s) => ({ luisMode: !s.luisMode })),
    }),
    {
      name: 'articula-caj-v3',
      partialize: (state) => ({
        // Auth state is derived from Supabase sessionStorage — not persisted here
        darkMode: state.darkMode,
        sidebarCollapsed: state.sidebarCollapsed,
        luisMode: state.luisMode,
        // Persist notification read state so "mark all read" survives a reload
        notifications: state.notifications,
      }),
    }
  )
);
