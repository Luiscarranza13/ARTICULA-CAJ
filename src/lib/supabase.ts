import { createClient } from '@supabase/supabase-js';
import type { User, UserRole } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY en .env');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type PerfilRow = {
  id: string;
  auth_user_id: string | null;
  rol: string | null;
  nombre: string | null;
  apellido: string | null;
  dni: string | null;
  celular: string | null;
  correo: string | null;
  organizacion: string | null;
  ubicacion_texto: string | null;
  rubro_texto: string | null;
  avatar_url: string | null;
  bio: string | null;
  verificado: boolean | null;
  estado: string | null;
  created_at: string | null;
};

export const normalizeRole = (rol?: string | null): UserRole => {
  if (rol === 'admin' || rol === 'administrador') return 'administrador';
  if (rol === 'comprador' || rol === 'institucion' || rol === 'productor') return rol;
  return 'productor';
};

export const dbRole = (rol: UserRole): string => (rol === 'administrador' ? 'admin' : rol);

export const perfilToUser = (perfil: PerfilRow, emailFallback = ''): User => ({
  id: perfil.id,
  nombre: perfil.nombre ?? '',
  apellido: perfil.apellido ?? '',
  dni: perfil.dni ?? '',
  celular: perfil.celular ?? '',
  correo: perfil.correo ?? emailFallback,
  organizacion: perfil.organizacion ?? '',
  ubicacion: perfil.ubicacion_texto ?? '',
  rubro: perfil.rubro_texto ?? '',
  rol: normalizeRole(perfil.rol),
  avatar: perfil.avatar_url ?? undefined,
  verified: Boolean(perfil.verificado),
  createdAt: perfil.created_at ?? new Date().toISOString(),
  bio: perfil.bio ?? undefined,
});

export const getCurrentProfile = async () => {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  const authUser = sessionData.session?.user;
  if (!authUser) return null;

  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    .eq('auth_user_id', authUser.id)
    .maybeSingle();

  if (error) throw error;
  if (data) return perfilToUser(data as PerfilRow, authUser.email ?? '');

  const { data: byEmail, error: emailError } = await supabase
    .from('perfiles')
    .select('*')
    .eq('correo', authUser.email ?? '')
    .maybeSingle();

  if (emailError) throw emailError;
  return byEmail ? perfilToUser(byEmail as PerfilRow, authUser.email ?? '') : null;
};
