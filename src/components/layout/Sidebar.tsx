import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, ShoppingBag, BarChart3,
  Newspaper, Settings, LogOut, ChevronLeft, ChevronRight, Leaf,
  Inbox, HelpCircle, Link2
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { classNames, initials } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/app/dashboard' },
  { label: 'Directorio', icon: Users, path: '/app/directorio' },
  { label: 'Vitrina Comercial', icon: ShoppingBag, path: '/app/vitrina' },
  { label: 'Articulación', icon: Link2, path: '/app/articulacion' },
  { label: 'Indicadores', icon: BarChart3, path: '/app/indicadores' },
  { label: 'Contenidos', icon: Newspaper, path: '/app/contenidos' },
];

const bottomItems = [
  { label: 'Solicitudes', icon: Inbox, path: '/app/admin' },
  { label: 'Configuración', icon: Settings, path: '/app/configuracion' },
  { label: 'Ayuda', icon: HelpCircle, path: '/app/ayuda' },
];

export default function Sidebar() {
  const location = useLocation();
  const { user, logout, sidebarCollapsed, toggleSidebarCollapsed } = useStore();

  const isActive = (path: string) => location.pathname === path;
  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
  };

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 72 : 256 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="fixed left-0 top-0 h-full bg-white border-r border-surface-100 flex flex-col z-40 shadow-sm overflow-hidden"
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-surface-100 min-h-[72px]">
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2.5"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-emerald">
                <Leaf className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-surface-900 font-display leading-none">ARTICULA</p>
                <p className="text-xs font-semibold text-emerald-600 leading-none mt-0.5">CAJ</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {sidebarCollapsed && (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-emerald mx-auto">
            <Leaf className="w-4 h-4 text-white" />
          </div>
        )}
        {!sidebarCollapsed && (
          <button
            onClick={toggleSidebarCollapsed}
            aria-label="Contraer barra lateral"
            className="w-7 h-7 rounded-lg bg-surface-100 hover:bg-surface-200 flex items-center justify-center transition-colors text-surface-500 hover:text-surface-700"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto scrollbar-thin">
        {sidebarCollapsed && (
          <button
            onClick={toggleSidebarCollapsed}
            aria-label="Expandir barra lateral"
            className="w-full flex justify-center p-2 mb-2 text-surface-400 hover:text-surface-600 hover:bg-surface-100 rounded-xl transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        <div className="space-y-0.5">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={classNames(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group',
                  active
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-surface-600 hover:bg-surface-50 hover:text-surface-900'
                )}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <item.icon className={classNames('w-5 h-5 flex-shrink-0 transition-colors', active ? 'text-emerald-600' : 'text-surface-400 group-hover:text-surface-600')} />
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {active && !sidebarCollapsed && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Divider */}
        <div className="border-t border-surface-100 my-3" />

        <div className="space-y-0.5">
          {bottomItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={classNames(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group',
                  active ? 'bg-emerald-50 text-emerald-700' : 'text-surface-600 hover:bg-surface-50 hover:text-surface-900'
                )}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <item.icon className={classNames('w-5 h-5 flex-shrink-0', active ? 'text-emerald-600' : 'text-surface-400 group-hover:text-surface-600')} />
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Profile */}
      <div className="border-t border-surface-100 p-3">
        <div className={classNames('flex items-center gap-3 p-2 rounded-xl hover:bg-surface-50 transition-colors cursor-pointer', sidebarCollapsed && 'justify-center')}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center flex-shrink-0 text-white text-sm font-bold shadow-sm overflow-hidden">
            {user?.avatar ? (
              <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              user ? initials(user.nombre, user.apellido) : 'U'
            )}
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-surface-800 truncate">{user?.nombre} {user?.apellido}</p>
                <p className="text-xs text-surface-400 truncate capitalize">{user?.rol}</p>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleLogout}
                className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center transition-colors text-surface-400 hover:text-red-500"
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
}
