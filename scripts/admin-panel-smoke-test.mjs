import fs from 'node:fs';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

const REQUIRED_ADMIN_TABLES = ['perfiles', 'productos', 'actores', 'publicaciones'];
const created = [];
const results = [];

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_SERVICE_KEY ?? env.SUPABASE_SERVICE_KEY ?? env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  fail('Faltan VITE_SUPABASE_URL y una key Supabase en .env');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const runId = `admin_smoke_${Date.now()}`;

try {
  await checkOpenApiSchema();
  await checkAdminReads();
  await checkAdminCrud();
  await checkSolicitudesFlow();
  await cleanup();

  console.log('\nADMIN PANEL SMOKE TEST: OK\n');
  for (const item of results) {
    console.log(`✓ ${item}`);
  }
} catch (error) {
  await cleanup().catch(() => undefined);
  console.error('\nADMIN PANEL SMOKE TEST: FAIL\n');
  console.error(error?.message ?? error);
  process.exitCode = 1;
}

async function checkSolicitudesFlow() {
  const solicitud = await insertOne('publicaciones', {
    tipo: 'oportunidad',
    titulo: `SOLICITUD:contacto:${runId}`,
    contenido: JSON.stringify({
      tipo: 'contacto',
      nombre: 'Smoke Solicitud',
      email: `${runId}.solicitud@example.com`,
      telefono: '999999999',
      mensaje: 'Solicitud temporal para verificar bandeja de solicitudes.',
    }),
    estado: 'pendiente',
    fijada: false,
  });

  created.push(['publicaciones', solicitud.id]);

  const { data, error } = await supabase
    .from('publicaciones')
    .select('id,titulo,contenido,estado,created_at')
    .like('titulo', 'SOLICITUD:%')
    .eq('id', solicitud.id)
    .single();

  throwIfError('solicitudes read', error);
  assert(data.estado === 'pendiente', 'La solicitud no inicio como pendiente');

  await updateAndVerify('publicaciones', solicitud.id, { estado: 'aprobado' }, ['estado']);
  await updateAndVerify('publicaciones', solicitud.id, { estado: 'rechazado' }, ['estado']);
  await deleteOne('publicaciones', solicitud.id);

  pass('Solicitudes: formulario/admin aprueba, rechaza y elimina registros tipo SOLICITUD');
}

function loadEnv() {
  const envFile = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
  const parsed = {};

  for (const line of envFile.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    parsed[key] = value;
  }

  return { ...parsed, ...process.env };
}

async function checkOpenApiSchema() {
  const response = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      Accept: 'application/openapi+json',
    },
  });

  if (!response.ok) fail(`No se pudo leer el esquema REST: HTTP ${response.status}`);

  const spec = await response.json();
  const schemas = Object.keys(spec.definitions ?? spec.components?.schemas ?? {});
  for (const table of [...REQUIRED_ADMIN_TABLES, 'v_admin_resumen']) {
    assert(schemas.includes(table), `No existe ${table} en el esquema REST`);
  }
  pass('Esquema REST expone perfiles, productos, actores, publicaciones y v_admin_resumen');
}

async function checkAdminReads() {
  const [resumen, perfiles, productos, actores, publicaciones] = await Promise.all([
    supabase.from('v_admin_resumen').select('*').maybeSingle(),
    supabase.from('perfiles').select('id,nombre,apellido,correo,rol,organizacion,estado,verificado,created_at').order('created_at', { ascending: false }).limit(100),
    supabase.from('productos').select('id,nombre,precio,unidad,estado,publicado,destacado,created_at').order('created_at', { ascending: false }).limit(100),
    supabase.from('actores').select('id,nombre,tipo,rubro_texto,estado,verificado,created_at').order('created_at', { ascending: false }).limit(100),
    supabase.from('publicaciones').select('id,titulo,contenido,tipo,estado,fijada,created_at').order('created_at', { ascending: false }).limit(100),
  ]);

  throwIfError('v_admin_resumen', resumen.error);
  throwIfError('perfiles read', perfiles.error);
  throwIfError('productos read', productos.error);
  throwIfError('actores read', actores.error);
  throwIfError('publicaciones read', publicaciones.error);

  assert(resumen.data, 'v_admin_resumen no devuelve datos');
  for (const field of ['total_usuarios', 'productos_activos', 'publicaciones', 'elementos_en_revision']) {
    assert(Number.isFinite(Number(resumen.data[field])), `v_admin_resumen.${field} no es numerico`);
  }

  const admins = await supabase.from('perfiles').select('id,correo,rol').eq('rol', 'admin').limit(10);
  throwIfError('admin profiles read', admins.error);
  assert((admins.data ?? []).length > 0, 'No hay ningun perfil con rol admin');

  pass(`Lecturas del panel funcionan: perfiles=${perfiles.data.length}, productos=${productos.data.length}, actores=${actores.data.length}, publicaciones=${publicaciones.data.length}`);
  pass(`Existe al menos un perfil administrador: ${admins.data[0].correo ?? admins.data[0].id}`);
}

async function checkAdminCrud() {
  const tempProfile = await insertOne('perfiles', {
    rol: 'productor',
    nombre: 'Smoke',
    apellido: 'Admin',
    dni: uniqueDigits(8),
    celular: uniqueDigits(9),
    correo: `${runId}@example.com`,
    organizacion: 'Smoke Test',
    ubicacion_texto: 'Cajamarca',
    rubro_texto: 'QA',
    verificado: false,
    estado: 'pendiente',
  });

  created.push(['perfiles', tempProfile.id]);
  await updateAndVerify('perfiles', tempProfile.id, { estado: 'aprobado', verificado: true }, ['estado', 'verificado']);

  const tempActor = await insertOne('actores', {
    nombre: `Actor ${runId}`,
    tipo: 'empresa',
    rubro_texto: 'QA',
    ubicacion_texto: 'Cajamarca',
    provincia_texto: 'Cajamarca',
    descripcion: 'Registro temporal para verificar CRUD del panel admin.',
    productos: ['Producto QA'],
    contacto: '999999999',
    correo: `${runId}.actor@example.com`,
    capacidad_productiva: '1 unidad',
    verificado: false,
    estado: 'pendiente',
    miembros: 1,
    fundado: 2026,
    propietario_id: tempProfile.id,
  });

  created.push(['actores', tempActor.id]);
  await updateAndVerify('actores', tempActor.id, { estado: 'aprobado', verificado: true }, ['estado', 'verificado']);

  const category = await firstOrFail('categorias_producto', 'id,nombre');
  const tempProduct = await insertOne('productos', {
    actor_id: tempActor.id,
    categoria_id: category.id,
    nombre: `Producto ${runId}`,
    descripcion: 'Producto temporal para verificar CRUD del panel admin.',
    precio: 1.23,
    moneda: 'PEN',
    unidad: 'kg',
    disponibilidad: 10,
    temporada: 'Todo el ano',
    destacado: false,
    estado: 'pendiente',
    publicado: false,
  });

  created.push(['productos', tempProduct.id]);
  await updateAndVerify('productos', tempProduct.id, { estado: 'aprobado', publicado: true, destacado: true }, ['estado', 'publicado', 'destacado']);

  const tempPost = await insertOne('publicaciones', {
    autor_id: tempProfile.id,
    actor_id: tempActor.id,
    tipo: 'publicacion',
    titulo: `Publicacion ${runId}`,
    contenido: 'Publicacion temporal para verificar CRUD del panel admin.',
    estado: 'pendiente',
    fijada: false,
  });

  created.push(['publicaciones', tempPost.id]);
  await updateAndVerify('publicaciones', tempPost.id, { estado: 'aprobado', fijada: true }, ['estado', 'fijada']);

  await deleteOne('publicaciones', tempPost.id);
  await deleteOne('productos', tempProduct.id);
  await deleteOne('actores', tempActor.id);
  await deleteOne('perfiles', tempProfile.id);

  pass('CRUD completo funciona para perfiles, actores, productos y publicaciones');
  pass('Acciones del admin funcionan: estado, verificacion, publicar, destacar y fijar');
}

async function insertOne(table, values) {
  const { data, error } = await supabase.from(table).insert(values).select('*').single();
  throwIfError(`${table} insert`, error);
  assert(data?.id, `${table} insert no devolvio id`);
  pass(`${table}: create OK (${data.id})`);
  return data;
}

async function updateAndVerify(table, id, values, fields) {
  const { error } = await supabase.from(table).update(values).eq('id', id);
  throwIfError(`${table} update`, error);

  const { data, error: selectError } = await supabase.from(table).select('*').eq('id', id).single();
  throwIfError(`${table} read after update`, selectError);

  for (const field of fields) {
    assert(data[field] === values[field], `${table}.${field} no se actualizo. Esperado ${values[field]}, recibido ${data[field]}`);
  }

  pass(`${table}: update/read OK`);
}

async function deleteOne(table, id) {
  const { error } = await supabase.from(table).delete().eq('id', id);
  throwIfError(`${table} delete`, error);

  const { data, error: selectError } = await supabase.from(table).select('id').eq('id', id).maybeSingle();
  throwIfError(`${table} read after delete`, selectError);
  assert(data === null, `${table} delete no elimino ${id}`);

  removeCreated(table, id);
  pass(`${table}: delete OK`);
}

async function firstOrFail(table, columns) {
  const { data, error } = await supabase.from(table).select(columns).limit(1).single();
  throwIfError(`${table} first`, error);
  assert(data?.id, `${table} no tiene registros base`);
  return data;
}

async function cleanup() {
  while (created.length > 0) {
    const [table, id] = created.pop();
    await supabase.from(table).delete().eq('id', id);
  }
}

function removeCreated(table, id) {
  const index = created.findIndex(([t, rowId]) => t === table && rowId === id);
  if (index >= 0) created.splice(index, 1);
}

function uniqueDigits(length) {
  return String(Date.now()).slice(-length).padStart(length, '0');
}

function throwIfError(label, error) {
  if (error) fail(`${label}: ${error.message}`);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function pass(message) {
  results.push(message);
}

function fail(message) {
  throw new Error(message);
}
