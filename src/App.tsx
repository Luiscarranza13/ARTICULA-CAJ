import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import AppLayout from './components/layout/AppLayout'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import DirectoryPage from './pages/DirectoryPage'
import MarketplacePage from './pages/MarketplacePage'
import ArticulationPage from './pages/ArticulationPage'
import AdminContactPage from './pages/AdminContactPage'
import IndicatorsPage from './pages/IndicatorsPage'
import ContentPage from './pages/ContentPage'
import SettingsPage from './pages/SettingsPage'
import HelpPage from './pages/HelpPage'
import LuisPage from './pages/LuisPage'
import { useStore } from './store/useStore'
import { getCurrentProfile, supabase } from './lib/supabase'

export default function App() {
  const login = useStore((state) => state.login);
  const logout = useStore((state) => state.logout);
  const setAuthLoading = useStore((state) => state.setAuthLoading);

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

  return (
    <BrowserRouter>
      <ThemeManager />
      <LuisModeManager />
      <Toaster position="top-right" />
      <Routes>
        {/* Rutas públicas */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
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
          <Route path="configuracion" element={<SettingsPage />} />
          <Route path="ayuda" element={<HelpPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
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
        try { sheet.disabled = true; } catch (_) { /* cross-origin, skip */ }
      });
    };

    const enableAll = () => {
      Array.from(document.styleSheets).forEach((sheet) => {
        try { sheet.disabled = false; } catch (_) {}
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
