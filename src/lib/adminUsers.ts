import type { User, UserRole } from '../types';
import { dbRole, perfilToUser, supabase, supabaseAdmin, type PerfilRow } from './supabase';

const db = supabaseAdmin ?? supabase;

export type AdminUserInput = {
  nombre: string;
  apellido: string;
  dni: string;
  celular: string;
  correo: string;
  organizacion: string;
  ubicacion: string;
  rubro: string;
  rol: UserRole;
  password?: string;
  verified: boolean;
  estado: string;
};

export type AdminUser = User & {
  authUserId: string | null;
  estado: string;
};

// ─── Listar usuarios ──────────────────────────────────────────────────────────
// Lee directamente de la tabla perfiles (no necesita Edge Function)
export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const { data, error } = await db
    .from('perfiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as AdminUserRow[]).map(adminUserRowToUser);
}

// ─── Crear usuario ─────────────────────────────────────────────────────────────
export async function createAdminUser(input: AdminUserInput): Promise<AdminUser> {
  const { data, error } = await supabase.functions.invoke<{ user: AdminUserRow }>('admin-users', {
    body: { action: 'create', input },
  });

  if (!error && data?.user) return adminUserRowToUser(data.user);

  // Fallback: insertar perfil directo con service key
  const payload = toPerfilPayload(input, null);
  const { data: row, error: dbErr } = await db.from('perfiles').insert(payload).select('*').single();
  if (dbErr) throw new Error(dbErr.message);
  return adminUserRowToUser(row as AdminUserRow);
}

// ─── Actualizar usuario ───────────────────────────────────────────────────────
export async function updateAdminUser(id: string, input: AdminUserInput, authUserId?: string | null): Promise<void> {
  const { error } = await supabase.functions.invoke('admin-users', {
    body: { action: 'update', id, authUserId, input },
  });

  if (!error) return;

  // Fallback: actualizar solo el perfil con service key (bypasa RLS)
  const payload = toPerfilPayload(input, authUserId ?? null);
  const { error: dbErr } = await db.from('perfiles').update(payload).eq('id', id);
  if (dbErr) throw new Error(dbErr.message);
}

// ─── Eliminar usuario ─────────────────────────────────────────────────────────
export async function deleteAdminUser(user: AdminUser): Promise<void> {
  const { error } = await supabase.functions.invoke('admin-users', {
    body: { action: 'delete', id: user.id, authUserId: user.authUserId },
  });

  if (!error) return;

  // Fallback: eliminar solo el perfil con service key
  const { error: dbErr } = await db.from('perfiles').delete().eq('id', user.id);
  if (dbErr) throw new Error(dbErr.message);
}

// ─── Tipos ────────────────────────────────────────────────────────────────────
type AdminUserRow = PerfilRow & {
  auth_user_id: string | null;
  estado: string | null;
};

function adminUserRowToUser(row: AdminUserRow): AdminUser {
  return {
    ...perfilToUser(row, row.correo ?? ''),
    authUserId: row.auth_user_id,
    estado: row.estado ?? 'pendiente',
  };
}

export function toPerfilPayload(input: AdminUserInput, authUserId: string | null, email = input.correo.trim().toLowerCase()) {
  return {
    auth_user_id: authUserId,
    rol: dbRole(input.rol),
    nombre: input.nombre.trim(),
    apellido: input.apellido.trim(),
    dni: input.dni.trim() || null,
    celular: input.celular.trim() || null,
    correo: email,
    organizacion: input.organizacion.trim() || null,
    ubicacion_texto: input.ubicacion.trim() || null,
    rubro_texto: input.rubro.trim() || null,
    verificado: input.verified,
    estado: input.estado,
  };
}
