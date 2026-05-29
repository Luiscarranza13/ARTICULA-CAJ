const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type UserRole = 'productor' | 'comprador' | 'institucion' | 'administrador';

type AdminUserInput = {
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

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return json({ ok: true }, 200);
  if (request.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  try {
    await assertAdmin(request);
    const body = await request.json() as { action?: string; id?: string; authUserId?: string | null; input?: AdminUserInput };

    if (body.action === 'list') return json({ users: await listUsers() });
    if (body.action === 'create') return json({ user: await createUser(requiredInput(body.input)) });
    if (body.action === 'update') {
      await updateUser(requiredId(body.id), requiredInput(body.input), body.authUserId ?? null);
      return json({ ok: true });
    }
    if (body.action === 'delete') {
      await deleteUser(requiredId(body.id), body.authUserId ?? null);
      return json({ ok: true });
    }

    throw httpError(400, 'Acción inválida');
  } catch (error) {
    const status = error instanceof AppError ? error.status : 500;
    const message = error instanceof Error ? error.message : 'Operacion de usuarios fallida';
    return json({ ok: false, error: message }, status);
  }
});

async function assertAdmin(request: Request) {
  const auth = request.headers.get('Authorization');
  if (!auth) throw httpError(401, 'Sesion requerida');

  const userResponse = await fetch(`${requiredSecret('SUPABASE_URL')}/auth/v1/user`, {
    headers: {
      apikey: requiredSecret('SUPABASE_SERVICE_ROLE_KEY'),
      Authorization: auth,
    },
  });

  if (!userResponse.ok) throw httpError(401, 'Sesión inválida');
  const user = await userResponse.json() as { id?: string };
  if (!user.id) throw httpError(401, 'Sesión inválida');

  const profileResponse = await supabaseFetch(`/rest/v1/perfiles?auth_user_id=eq.${encodeURIComponent(user.id)}&select=rol&limit=1`);
  const profiles = await profileResponse.json() as { rol?: string }[];
  if (!profileResponse.ok || profiles[0]?.rol !== 'admin') throw httpError(403, 'Solo administradores');
}

async function listUsers() {
  const response = await supabaseFetch('/rest/v1/perfiles?select=*&order=created_at.desc');
  if (!response.ok) throw httpError(502, await response.text());
  return response.json();
}

async function createUser(input: AdminUserInput) {
  const email = input.correo.trim().toLowerCase();
  if (!input.password || input.password.length < 8) throw httpError(400, 'La contraseña debe tener al menos 8 caracteres.');

  const authResponse = await supabaseFetch('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password: input.password,
      email_confirm: true,
      user_metadata: { nombre: input.nombre, apellido: input.apellido, rol: input.rol },
    }),
  });
  const authData = await authResponse.json().catch(() => null) as { id?: string; user?: { id?: string }; msg?: string; message?: string } | null;
  if (!authResponse.ok) throw httpError(502, authData?.msg || authData?.message || 'No se pudo crear usuario auth');

  const authUserId = authData?.id || authData?.user?.id || null;
  const upsertResponse = await supabaseFetch('/rest/v1/perfiles?on_conflict=correo', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(toPerfilPayload(input, authUserId, email)),
  });
  const rows = await upsertResponse.json().catch(() => null) as unknown[] | null;
  if (!upsertResponse.ok || !rows?.[0]) throw httpError(502, 'No se pudo guardar perfil');
  return rows[0];
}

async function updateUser(id: string, input: AdminUserInput, authUserId: string | null) {
  const email = input.correo.trim().toLowerCase();
  if (authUserId) {
    const authResponse = await supabaseFetch(`/auth/v1/admin/users/${authUserId}`, {
      method: 'PUT',
      body: JSON.stringify({
        email,
        password: input.password || undefined,
        email_confirm: true,
        user_metadata: { nombre: input.nombre, apellido: input.apellido, rol: input.rol },
      }),
    });
    if (!authResponse.ok) throw httpError(502, 'No se pudo actualizar auth');
  }

  const response = await supabaseFetch(`/rest/v1/perfiles?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(toPerfilPayload(input, authUserId, email)),
  });
  if (!response.ok) throw httpError(502, await response.text());
}

async function deleteUser(id: string, authUserId: string | null) {
  const profileResponse = await supabaseFetch(`/rest/v1/perfiles?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!profileResponse.ok) throw httpError(502, await profileResponse.text());

  if (authUserId) {
    const authResponse = await supabaseFetch(`/auth/v1/admin/users/${authUserId}`, { method: 'DELETE' });
    if (!authResponse.ok) throw httpError(502, 'No se pudo eliminar auth');
  }
}

function toPerfilPayload(input: AdminUserInput, authUserId: string | null, email: string) {
  return {
    auth_user_id: authUserId,
    rol: input.rol === 'administrador' ? 'admin' : input.rol,
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

function supabaseFetch(path: string, init: RequestInit = {}) {
  const serviceKey = requiredSecret('SUPABASE_SERVICE_ROLE_KEY');
  return fetch(`${requiredSecret('SUPABASE_URL')}${path}`, {
    ...init,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
}

function requiredInput(input?: AdminUserInput) {
  if (!input) throw httpError(400, 'Falta input');
  return input;
}

function requiredId(id?: string) {
  if (!id) throw httpError(400, 'Falta id');
  return id;
}

function requiredSecret(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw httpError(500, `Falta configurar ${name}`);
  return value;
}

class AppError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function httpError(status: number, message: string) {
  return new AppError(status, message);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
