import { createClient } from '@supabase/supabase-js';
import type { User, UserRole } from '../types';
import { dbRole, perfilToUser, type PerfilRow } from './supabase';

const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY as string | undefined;
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;

const adminClient = serviceKey && url
  ? createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

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

const requireAdminClient = () => {
  if (!adminClient) {
    throw new Error('Falta VITE_SUPABASE_SERVICE_KEY para administrar usuarios.');
  }
  return adminClient;
};

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const client = requireAdminClient();
  const { data, error } = await client
    .from('perfiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw asError(error);
  return ((data ?? []) as PerfilRow[]).map((row) => ({
    ...perfilToUser(row),
    authUserId: row.auth_user_id,
    estado: row.estado ?? 'pendiente',
  }));
}

export async function createAdminUser(input: AdminUserInput): Promise<AdminUser> {
  const client = requireAdminClient();
  const email = input.correo.trim().toLowerCase();

  if (!input.password || input.password.length < 8) {
    throw new Error('La contrasena debe tener al menos 8 caracteres.');
  }

  const existingByEmail = await client
    .from('perfiles')
    .select('id,auth_user_id')
    .eq('correo', email)
    .maybeSingle();

  if (existingByEmail.error) throw asError(existingByEmail.error);

  const { data: authData, error: authError } = await client.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      nombre: input.nombre,
      apellido: input.apellido,
      rol: input.rol,
    },
  });

  if (authError) throw asError(authError);
  const authUserId = authData.user?.id ?? null;
  const payload = toPerfilPayload(input, authUserId, email);

  const generatedProfile = authUserId
    ? await client.from('perfiles').select('id').eq('auth_user_id', authUserId).maybeSingle()
    : { data: null, error: null };

  if (generatedProfile.error) {
    if (authUserId) await client.auth.admin.deleteUser(authUserId).catch(() => undefined);
    throw asError(generatedProfile.error);
  }

  if (existingByEmail.data?.id && generatedProfile.data?.id && existingByEmail.data.id !== generatedProfile.data.id) {
    const { error: deleteGeneratedError } = await client.from('perfiles').delete().eq('id', generatedProfile.data.id);
    if (deleteGeneratedError) {
      if (authUserId) await client.auth.admin.deleteUser(authUserId).catch(() => undefined);
      throw asError(deleteGeneratedError);
    }
  }

  const targetProfileId = existingByEmail.data?.id ?? generatedProfile.data?.id;
  const result = targetProfileId
    ? await client.from('perfiles').update(payload).eq('id', targetProfileId).select('*').single()
    : await client.from('perfiles').insert(payload).select('*').single();

  if (result.error) {
    if (authUserId) await client.auth.admin.deleteUser(authUserId).catch(() => undefined);
    throw asError(result.error);
  }

  const row = result.data as PerfilRow;
  return {
    ...perfilToUser(row, email),
    authUserId: row.auth_user_id,
    estado: row.estado ?? input.estado,
  };
}

export async function updateAdminUser(id: string, input: AdminUserInput, authUserId?: string | null): Promise<void> {
  const client = requireAdminClient();
  const email = input.correo.trim().toLowerCase();

  if (authUserId) {
    const { error: authError } = await client.auth.admin.updateUserById(authUserId, {
      email,
      password: input.password || undefined,
      email_confirm: true,
      user_metadata: {
        nombre: input.nombre,
        apellido: input.apellido,
        rol: input.rol,
      },
    });
    if (authError) throw asError(authError);
  }

  const { error } = await client
    .from('perfiles')
    .update(toPerfilPayload(input, authUserId ?? null, email))
    .eq('id', id);

  if (error) throw asError(error);
}

export async function deleteAdminUser(user: AdminUser): Promise<void> {
  const client = requireAdminClient();
  const { error } = await client.from('perfiles').delete().eq('id', user.id);
  if (error) throw asError(error);

  if (user.authUserId) {
    const { error: authError } = await client.auth.admin.deleteUser(user.authUserId);
    if (authError) throw asError(authError);
  }
}

function toPerfilPayload(input: AdminUserInput, authUserId: string | null, email: string) {
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

function asError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return new Error(String((error as { message: unknown }).message));
  }
  return new Error('Operacion de usuarios fallida.');
}
