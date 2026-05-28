import { useState } from 'react';
import { Bell, Check, Sun, Moon, Search, X, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { classNames, timeAgo } from '../../lib/utils';

interface Props {
  title: string;
  subtitle?: string;
}

const notifIcons: Record<string, string> = {
  mensaje: '💬',
  conexion: '🤝',
  oportunidad: '💼',
  evento: '📅',
  sistema: '⚙️',
};

export default function Header({ title, subtitle }: Props) {
  const {
    darkMode,
    toggleDarkMode,
    sidebarCollapsed,
    notifications,
    unreadCount,
    markAsRead,
    markAllRead,
  } = useStore();
  const [showSearch, setShowSearch] = useState(false);
  const [showNotif, setShowNotif] = useState(false);

  return (
    <header
      className={classNames('fixed top-0 right-0 z-30 bg-white/95 border-b border-surface-100 transition-all duration-300', sidebarCollapsed ? 'left-[72px]' : 'left-64')}
    >
      <div className="flex items-center justify-between px-6 h-16">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-bold text-surface-900 font-display leading-none">{title}</h1>
            {subtitle && <p className="text-xs text-surface-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Ver página principal */}
          <Link
            to="/"
            target="_blank"
            rel="noopener noreferrer"
            title="Ver página principal"
            aria-label="Ver página principal"
            className="w-9 h-9 rounded-xl hover:bg-surface-100 flex items-center justify-center text-surface-500 hover:text-emerald-700 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>

          {/* Búsqueda */}
          <AnimatePresence>
            {showSearch && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 280, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <input
                  autoFocus
                  type="text"
                  placeholder="Buscar actores, productos..."
                  className="input-field py-2 text-sm"
                  onBlur={() => setShowSearch(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="button"
            onClick={() => setShowSearch((s) => !s)}
            aria-label={showSearch ? 'Cerrar búsqueda' : 'Abrir búsqueda'}
            className="w-9 h-9 rounded-xl hover:bg-surface-100 flex items-center justify-center text-surface-500 hover:text-surface-700 transition-colors"
          >
            {showSearch ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
          </button>

          {/* Modo oscuro */}
          <button
            type="button"
            onClick={toggleDarkMode}
            aria-label={darkMode ? 'Activar modo claro' : 'Activar modo oscuro'}
            className="w-9 h-9 rounded-xl hover:bg-surface-100 flex items-center justify-center text-surface-500 hover:text-surface-700 transition-colors"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Notificaciones */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotif((s) => !s)}
              aria-label={showNotif ? 'Cerrar notificaciones' : 'Abrir notificaciones'}
              className="w-9 h-9 rounded-xl hover:bg-surface-100 flex items-center justify-center text-surface-500 hover:text-surface-700 transition-colors relative"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showNotif && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotif(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-glass-xl border border-surface-100 z-50 overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100">
                      <h3 className="font-semibold text-surface-800 text-sm">Notificaciones</h3>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={markAllRead}
                          className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" /> Marcar todas
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto scrollbar-thin divide-y divide-surface-50">
                      {notifications.length === 0 && (
                        <p className="text-center text-surface-400 text-sm py-6">Sin notificaciones</p>
                      )}
                      {notifications.map((n) => (
                        <button
                          type="button"
                          key={n.id}
                          onClick={() => markAsRead(n.id)}
                          className={classNames('w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-surface-50 transition-colors', !n.leida && 'bg-emerald-50/30')}
                        >
                          <span className="text-lg flex-shrink-0">{notifIcons[n.tipo] ?? '📢'}</span>
                          <div className="flex-1 min-w-0">
                            <p className={classNames('text-sm font-medium text-surface-800 leading-snug', !n.leida && 'font-semibold')}>{n.titulo}</p>
                            <p className="text-xs text-surface-500 mt-0.5 line-clamp-1">{n.descripcion}</p>
                            <p className="text-xs text-surface-400 mt-1">{timeAgo(n.createdAt)}</p>
                          </div>
                          {!n.leida && <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 mt-1.5" />}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
