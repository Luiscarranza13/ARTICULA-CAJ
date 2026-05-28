import { Outlet, Navigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import Sidebar from './Sidebar';
import Header from './Header';
import { useLocation } from 'react-router-dom';
import { classNames } from '../../lib/utils';
import { canAccessRoute, firstRouteForRole } from '../../lib/permissions';
import { usePageTransition } from '../../hooks/usePageTransition';

const pageTitles: Record<string, { title: string; subtitle?: string }> = {
  '/app/dashboard': { title: 'Dashboard', subtitle: 'Resumen de la plataforma' },
  '/app/directorio': { title: 'Directorio de Actores', subtitle: 'Productores, asociaciones e instituciones' },
  '/app/vitrina': { title: 'Vitrina Comercial', subtitle: 'Productos y oportunidades de venta' },
  '/app/articulacion': { title: 'Articulación', subtitle: 'Networking y colaboración territorial' },
  '/app/indicadores': { title: 'Indicadores', subtitle: 'Analítica y KPIs regionales' },
  '/app/contenidos': { title: 'Contenidos', subtitle: 'Noticias, eventos y convocatorias' },
  '/app/admin': { title: 'Solicitudes', subtitle: 'Gestión de contacto y adquisición de productos' },
  '/app/usuarios': { title: 'Usuarios', subtitle: 'Cuentas, roles y credenciales de acceso' },
  '/app/configuracion': { title: 'Configuración', subtitle: 'Ajustes de tu cuenta' },
  '/app/ayuda': { title: 'Ayuda', subtitle: 'Soporte y guias de uso' },
};

export default function AppLayout() {
  const { isAuthenticated, isAuthLoading, sidebarCollapsed, user } = useStore();
  const location = useLocation();
  usePageTransition();

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-surface-50 mesh-bg flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!canAccessRoute(user?.rol, location.pathname)) {
    return <Navigate to={firstRouteForRole(user?.rol)} replace />;
  }

  const page = pageTitles[location.pathname] ?? { title: 'ARTICULA CAJ', subtitle: '' };
  return (
    <div className="min-h-screen bg-surface-50 mesh-bg">
      <Sidebar />
      <div className={classNames('transition-all duration-300', sidebarCollapsed ? 'ml-[72px]' : 'ml-64')}>
        <Header title={page.title} subtitle={page.subtitle} />
        <main className="pt-16 min-h-screen">
          <div id="page-content" className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
