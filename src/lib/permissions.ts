import type { UserRole } from '../types';

export type AppRoutePermission = {
  path: string;
  roles: UserRole[];
};

const allRoles: UserRole[] = ['productor', 'comprador', 'institucion', 'administrador'];

export const routePermissions: AppRoutePermission[] = [
  { path: '/app/dashboard', roles: allRoles },
  { path: '/app/directorio', roles: allRoles },
  { path: '/app/vitrina', roles: ['productor', 'comprador', 'administrador'] },
  { path: '/app/articulacion', roles: ['productor', 'comprador', 'institucion', 'administrador'] },
  { path: '/app/indicadores', roles: ['institucion', 'administrador'] },
  { path: '/app/contenidos', roles: ['institucion', 'administrador'] },
  { path: '/app/admin', roles: ['administrador'] },
  { path: '/app/usuarios', roles: ['administrador'] },
  { path: '/app/configuracion', roles: allRoles },
  { path: '/app/ayuda', roles: allRoles },
];

export function canAccessRoute(role: UserRole | string | undefined, path: string) {
  const normalizedRole = normalizePermissionRole(role);
  if (!normalizedRole) return false;
  if (normalizedRole === 'administrador') return true;
  const permission = routePermissions.find((item) => item.path === path);
  return permission ? permission.roles.includes(normalizedRole) : true;
}

export function firstRouteForRole(role: UserRole | string | undefined) {
  const normalizedRole = normalizePermissionRole(role);
  if (!normalizedRole) return '/login';
  return routePermissions.find((item) => item.roles.includes(normalizedRole))?.path ?? '/app/dashboard';
}

function normalizePermissionRole(role: UserRole | string | undefined): UserRole | null {
  if (!role) return null;
  const normalized = role.toLowerCase().trim();
  if (normalized === 'admin' || normalized === 'administrador') return 'administrador';
  if (normalized === 'comprador') return 'comprador';
  if (normalized === 'institucion' || normalized === 'institución') return 'institucion';
  if (normalized === 'productor') return 'productor';
  return null;
}
