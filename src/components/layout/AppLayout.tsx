import { Outlet, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';
import Sidebar from './Sidebar';
import Header from './Header';
import { useLocation } from 'react-router-dom';
import { classNames } from '../../lib/utils';

const pageTitles: Record<string, { title: string; subtitle?: string }> = {
  '/app/dashboard': { title: 'Dashboard', subtitle: 'Resumen de la plataforma' },
  '/app/directorio': { title: 'Directorio de Actores', subtitle: 'Productores, asociaciones e instituciones' },
  '/app/vitrina': { title: 'Vitrina Comercial', subtitle: 'Productos y oportunidades de venta' },
  '/app/articulacion': { title: 'Articulación', subtitle: 'Networking y colaboración territorial' },
  '/app/indicadores': { title: 'Indicadores', subtitle: 'Analítica y KPIs regionales' },
  '/app/contenidos': { title: 'Contenidos', subtitle: 'Noticias, eventos y convocatorias' },
  '/app/admin': { title: 'Solicitudes', subtitle: 'Gestión de contacto y adquisición de productos' },
  '/app/configuracion': { title: 'Configuración', subtitle: 'Ajustes de tu cuenta' },
  '/app/ayuda': { title: 'Ayuda', subtitle: 'Soporte y guias de uso' },
};

export default function AppLayout() {
  const { isAuthenticated, isAuthLoading, sidebarCollapsed } = useStore();
  const location = useLocation();

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-surface-50 mesh-bg flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const page = pageTitles[location.pathname] ?? { title: 'ARTICULA CAJ', subtitle: '' };
  return (
    <div className="min-h-screen bg-surface-50 mesh-bg">
      <Sidebar />
      <div className={classNames('transition-all duration-300', sidebarCollapsed ? 'ml-[72px]' : 'ml-64')}>
        <Header title={page.title} subtitle={page.subtitle} />
        <main className="pt-16 min-h-screen">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="p-6"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
