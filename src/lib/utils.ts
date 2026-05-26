export const formatCurrency = (amount: number): string =>
  `S/ ${amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const formatNumber = (n: number): string =>
  n.toLocaleString('es-PE');

export const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
};

export const formatDateShort = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
};

export const timeAgo = (dateStr: string): string => {
  const now = new Date();
  const then = new Date(dateStr);
  const diff = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (diff < 60) return 'hace un momento';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `hace ${Math.floor(diff / 86400)} días`;
  return formatDate(dateStr);
};

export const classNames = (...classes: (string | boolean | undefined | null)[]): string =>
  classes.filter(Boolean).join(' ');

export const getRolLabel = (rol: string): string => {
  const map: Record<string, string> = {
    productor: 'Productor',
    comprador: 'Comprador',
    institucion: 'Institución',
    administrador: 'Administrador',
  };
  return map[rol] ?? rol;
};

export const getRolColor = (rol: string): string => {
  const map: Record<string, string> = {
    productor: 'badge-emerald',
    comprador: 'badge-blue',
    institucion: 'badge-purple',
    administrador: 'badge-gold',
  };
  return map[rol] ?? 'badge-emerald';
};

export const getTipoActorColor = (tipo: string): string => {
  const map: Record<string, string> = {
    productor: 'bg-emerald-100 text-emerald-700',
    asociacion: 'bg-blue-100 text-blue-700',
    cooperativa: 'bg-purple-100 text-purple-700',
    empresa: 'bg-amber-100 text-amber-700',
    institucion: 'bg-surface-100 text-surface-700',
  };
  return map[tipo] ?? 'bg-surface-100 text-surface-700';
};

export const getDisponibilidadColor = (d: string): string => {
  const map: Record<string, string> = {
    disponible: 'bg-emerald-100 text-emerald-700',
    agotado: 'bg-red-100 text-red-700',
    temporada: 'bg-amber-100 text-amber-700',
  };
  return map[d] ?? 'bg-surface-100 text-surface-700';
};

export const initials = (nombre: string, apellido?: string): string => {
  if (apellido) return `${nombre[0]}${apellido[0]}`.toUpperCase();
  return nombre.slice(0, 2).toUpperCase();
};

export const truncate = (text: string, length = 100): string =>
  text.length > length ? `${text.slice(0, length)}...` : text;
