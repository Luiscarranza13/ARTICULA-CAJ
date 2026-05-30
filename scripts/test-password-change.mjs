/**
 * Verifica que el cambio de contraseña desde el admin panel funciona para cualquier usuario.
 * Uso: node scripts/test-password-change.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://glhsiqpppfsjiaaexvnr.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsaHNpcXBwcGZzamlhYWV4dm5yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQ5NTA4NCwiZXhwIjoyMDk1MDcxMDg0fQ.JgCMJWTNCa_eWissXx1eESr525cgxkTwgFjenT27e6U';
const ANON_KEY = 'sb_publishable_KiFwSRit9j2ZSLj00-PP_g_5tAlM1ud';

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });

const TEST_PASSWORD = 'TestPass2026!';

async function run() {
  console.log('=== Test: cambio de contraseña desde admin ===\n');

  // 1. Listar perfiles para encontrar un usuario no-admin con auth_user_id null o no
  const { data: perfiles, error: perfErr } = await admin
    .from('perfiles')
    .select('id, correo, nombre, apellido, rol, auth_user_id')
    .neq('correo', 'admin@gmail.com')
    .limit(10);

  if (perfErr) { console.error('Error listando perfiles:', perfErr.message); process.exit(1); }

  // Buscar un productor para la prueba
  const target = perfiles.find(p => p.rol === 'productor' && p.correo) ?? perfiles[0];
  if (!target) { console.error('No se encontró usuario de prueba'); process.exit(1); }

  console.log(`Usuario elegido: ${target.nombre} ${target.apellido} (${target.correo})`);
  console.log(`  rol: ${target.rol} | auth_user_id en perfil: ${target.auth_user_id ?? 'null'}\n`);

  // 2. Buscar el auth user por email si auth_user_id es null
  let authUserId = target.auth_user_id;
  if (!authUserId) {
    console.log('auth_user_id es null → buscando en auth por email...');
    const { data: { users }, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
    if (listErr) { console.error('Error listando auth users:', listErr.message); process.exit(1); }
    const found = users.find(u => u.email === target.correo);
    if (!found) {
      console.error(`No existe auth user con email ${target.correo}. No puede hacer login.`);
      process.exit(1);
    }
    authUserId = found.id;
    console.log(`  Encontrado auth user id: ${authUserId}\n`);
  }

  // 3. Cambiar contraseña vía admin API
  console.log(`Cambiando contraseña a: "${TEST_PASSWORD}"`);
  const { error: updateErr } = await admin.auth.admin.updateUserById(authUserId, {
    password: TEST_PASSWORD,
  });
  if (updateErr) { console.error('Error cambiando contraseña:', updateErr.message); process.exit(1); }
  console.log('  Contraseña actualizada en Supabase Auth ✓\n');

  // 4. Verificar login con la nueva contraseña
  console.log(`Verificando login con ${target.correo} / ${TEST_PASSWORD} ...`);
  const { data: loginData, error: loginErr } = await client.auth.signInWithPassword({
    email: target.correo,
    password: TEST_PASSWORD,
  });

  if (loginErr) {
    console.error('  ✗ Login FALLÓ:', loginErr.message);
    process.exit(1);
  }

  console.log(`  ✓ Login exitoso! user_id: ${loginData.user?.id}`);
  await client.auth.signOut();

  // 5. Confirmar que auth_user_id está guardado en el perfil
  if (!target.auth_user_id) {
    console.log('\nGuardando auth_user_id en el perfil (vínculo faltaba)...');
    const { error: patchErr } = await admin
      .from('perfiles')
      .update({ auth_user_id: authUserId })
      .eq('id', target.id);
    if (patchErr) console.warn('  Advertencia: no se pudo guardar auth_user_id:', patchErr.message);
    else console.log('  auth_user_id guardado ✓');
  }

  console.log('\n=== RESULTADO: cambio de contraseña funciona correctamente ===');
  console.log(`Usuario ${target.correo} puede iniciar sesión con contraseña "${TEST_PASSWORD}"`);
}

run().catch(err => { console.error('Error inesperado:', err); process.exit(1); });
