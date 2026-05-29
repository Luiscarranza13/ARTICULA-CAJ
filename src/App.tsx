import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { Analytics } from '@vercel/analytics/react'
import AppLayout from './components/layout/AppLayout'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import LuisPage from './pages/LuisPage'
const PublicDetailPage = lazy(() => import('./pages/PublicDetailPage'))
import { useStore } from './store/useStore'
import { getCurrentProfile, supabase } from './lib/supabase'

const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const DirectoryPage = lazy(() => import('./pages/DirectoryPage'))
const MarketplacePage = lazy(() => import('./pages/MarketplacePage'))
const PublicMarketplacePage = lazy(() => import('./pages/PublicMarketplacePage'))
const ArticulationPage = lazy(() => import('./pages/ArticulationPage'))
const AdminContactPage = lazy(() => import('./pages/AdminContactPage'))
const IndicatorsPage = lazy(() => import('./pages/IndicatorsPage'))
const ContentPage = lazy(() => import('./pages/ContentPage'))
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const HelpPage = lazy(() => import('./pages/HelpPage'))

export default function App() {
  const login = useStore((state) => state.login);
  const logout = useStore((state) => state.logout);
  const setAuthLoading = useStore((state) => state.setAuthLoading);
  const loadSiteContent = useStore((state) => state.loadSiteContent);

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      setAuthLoading(true);
      try {
        const profile = await getCurrentProfile();
        if (!mounted) return;
        if (profile) login(profile);
        else logout();
      } catch {
        if (mounted) logout();
      }
    };

    queueMicrotask(() => void loadSession());

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        logout();
        return;
      }

      getCurrentProfile()
        .then((profile) => {
          if (profile) login(profile);
          else setAuthLoading(false);
        })
        .catch(() => setAuthLoading(false));
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [login, logout, setAuthLoading]);

  useEffect(() => {
    void loadSiteContent();
  }, [loadSiteContent]);

  return (
    <BrowserRouter>
      <a href="#main-content" className="skip-link">Saltar al contenido</a>
      <ThemeManager />
      <LuisModeManager />
      <Toaster position="top-right" />
      <Analytics />
      <Suspense fallback={<div className="min-h-screen bg-surface-50 flex items-center justify-center text-surface-500">Cargando...</div>}>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/productos" element={<PublicMarketplacePage />} />
        <Route path="/contenido/:tipo/:id" element={<PublicDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/luis" element={<LuisPage />} />

        {/* Rutas protegidas */}
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="directorio" element={<DirectoryPage />} />
          <Route path="vitrina" element={<MarketplacePage />} />
          <Route path="articulacion" element={<ArticulationPage />} />
          <Route path="indicadores" element={<IndicatorsPage />} />
          <Route path="contenidos" element={<ContentPage />} />
          <Route path="admin" element={<AdminContactPage />} />
          <Route path="usuarios" element={<AdminUsersPage />} />
          <Route path="configuracion" element={<SettingsPage />} />
          <Route path="ayuda" element={<HelpPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

function ThemeManager() {
  const darkMode = useStore((state) => state.darkMode);
  const { pathname } = useLocation();
  const canUseDarkMode = pathname.startsWith('/app');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', canUseDarkMode && darkMode);
  }, [canUseDarkMode, darkMode]);

  return null;
}

function LuisModeManager() {
  const luisMode = useStore((state) => state.luisMode);

  useEffect(() => {
    const disableAll = () => {
      Array.from(document.styleSheets).forEach((sheet) => {
        try {
          sheet.disabled = true;
        } catch {
          // Some browser-managed stylesheets cannot be toggled.
        }
      });
    };

    const enableAll = () => {
      Array.from(document.styleSheets).forEach((sheet) => {
        try {
          sheet.disabled = false;
        } catch {
          // Some browser-managed stylesheets cannot be toggled.
        }
      });
    };

    if (luisMode) {
      disableAll();
      // Deshabilitar cualquier hoja de estilos que Vite agregue dinámicamente
      const observer = new MutationObserver(disableAll);
      observer.observe(document.head, { childList: true, subtree: true });
      return () => {
        observer.disconnect();
        enableAll();
      };
    } else {
      enableAll();
    }
  }, [luisMode]);

  return null;
}
