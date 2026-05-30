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
  // Intento 1: edge function (crea auth + perfil)
  const { data: edgeData, error: edgeError } = await supabase.functions.invoke<{ user: AdminUserRow }>('admin-users', {
    body: { action: 'create', input },
  });
  if (!edgeError && edgeData?.user) return adminUserRowToUser(edgeData.user);

  // Intento 2: fallback completo con supabaseAdmin
  if (!supabaseAdmin) throw new Error('No se puede crear el usuario: falta la clave de servicio.');

  const email = input.correo.trim().toLowerCase();
  const password = input.password;
  if (!password || password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');

  // 2a. Crear auth user (puede hacer login con email + password)
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre: input.nombre, apellido: input.apellido, rol: input.rol },
  });

  if (authError) {
    // Si ya existe el auth user, intentar actualizar solo el perfil
    if (!authError.message.includes('already been registered')) throw new Error(authError.message);
  }

  const authUserId = authData?.user?.id ?? null;

  // 2b. Upsert perfil con el auth_user_id (no falla si ya existe)
  const payload = toPerfilPayload(input, authUserId, email);
  const { data: row, error: dbErr } = await supabaseAdmin
    .from('perfiles')
    .upsert(payload, { onConflict: 'correo', ignoreDuplicates: false })
    .select('*')
    .single();
  if (dbErr) throw new Error(dbErr.message);
  return adminUserRowToUser(row as AdminUserRow);
}

// ─── Actualizar usuario ───────────────────────────────────────────────────────
export async function updateAdminUser(id: string, input: AdminUserInput, authUserId?: string | null): Promise<void> {
  const needsPasswordChange = Boolean(input.password && input.password.length >= 8);

  // Intento 1: edge function — la saltamos cuando authUserId es null y hay cambio de contraseña,
  // porque la edge function desplegada no puede resolver el auth user por email en ese caso.
  const tryEdge = authUserId || !needsPasswordChange;
  if (tryEdge) {
    const { error: edgeError } = await supabase.functions.invoke('admin-users', {
      body: { action: 'update', id, authUserId, input },
    });
    if (!edgeError) return;
  }

  // Intento 2: fallback con supabaseAdmin
  if (!supabaseAdmin) throw new Error('No se puede actualizar: falta la clave de servicio.');

  const email = input.correo.trim().toLowerCase();

  // 2a. Actualizar auth user (buscar por email si no tenemos el ID)
  let resolvedAuthUserId = authUserId ?? null;
  if (!resolvedAuthUserId) {
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    resolvedAuthUserId = list.users.find((u) => u.email === email)?.id ?? null;
    if (resolvedAuthUserId) {
      await supabaseAdmin.from('perfiles').update({ auth_user_id: resolvedAuthUserId }).eq('id', id);
    }
  }

  if (resolvedAuthUserId) {
    const authUpdates: Record<string, unknown> = {
      email,
      email_confirm: true,
      user_metadata: { nombre: input.nombre, apellido: input.apellido, rol: input.rol },
    };
    if (input.password && input.password.length >= 8) {
      authUpdates.password = input.password;
    }
    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(resolvedAuthUserId, authUpdates);
    if (authErr) throw new Error(`Error actualizando autenticación: ${authErr.message}`);
  } else if (input.password && input.password.length >= 8) {
    // El usuario existe en perfiles pero no tiene cuenta auth — crearla ahora
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: true,
      user_metadata: { nombre: input.nombre, apellido: input.apellido, rol: input.rol },
    });
    if (authErr) throw new Error(`Error creando autenticación: ${authErr.message}`);
    resolvedAuthUserId = authData.user.id;
  }

  // 2b. Actualizar perfil
  const payload = toPerfilPayload(input, resolvedAuthUserId, email);
  const { error: dbErr } = await supabaseAdmin.from('perfiles').update(payload).eq('id', id);
  if (dbErr) throw new Error(dbErr.message);
}

// ─── Eliminar usuario ─────────────────────────────────────────────────────────
export async function deleteAdminUser(user: AdminUser): Promise<void> {
  // Intento 1: edge function (elimina auth + perfil)
  const { error: edgeError } = await supabase.functions.invoke('admin-users', {
    body: { action: 'delete', id: user.id, authUserId: user.authUserId },
  });
  if (!edgeError) return;

  // Intento 2: fallback con supabaseAdmin
  if (!supabaseAdmin) throw new Error('No se puede eliminar: falta la clave de servicio.');

  // Eliminar perfil primero
  const { error: dbErr } = await supabaseAdmin.from('perfiles').delete().eq('id', user.id);
  if (dbErr) throw new Error(dbErr.message);

  // Eliminar auth user si existe
  if (user.authUserId) {
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(user.authUserId);
    if (authErr) console.warn('Perfil eliminado pero auth user no:', authErr.message);
  }
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
