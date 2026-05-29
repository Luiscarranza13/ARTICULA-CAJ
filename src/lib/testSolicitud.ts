/**
 * Script de diagnóstico — ejecuta esto en la consola del browser:
 *   import('/src/lib/testSolicitud.ts').then(m => m.runTest())
 *
 * O en la consola del dev server como:
 *   testSolicitud()
 */
import { supabaseAdmin, supabase } from './supabase';

export async function runTest() {
  console.group('🧪 Test de solicitud — diagnóstico completo');

  // 1. Verificar cliente admin
  if (!supabaseAdmin) {
    console.error('❌ supabaseAdmin es null — VITE_SUPABASE_SERVICE_KEY no está configurado');
  } else {
    console.info('✅ supabaseAdmin disponible');
  }

  // 2. Verificar send-gmail edge function
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const apiKey = import.meta.env.VITE_SEND_GMAIL_API_KEY as string;
  console.info('🔗 Edge function URL:', `${supabaseUrl}/functions/v1/submit-solicitud`);
  console.info('🔑 API key configurada:', Boolean(apiKey));

  // 3. Test INSERT con service key
  const testRecord = {
    tipo: 'oportunidad',
    titulo: 'SOLICITUD:contacto:TEST_DIAGNOSTICO',
    contenido: JSON.stringify({
      tipo: 'contacto',
      nombre: 'TEST Diagnóstico',
      email: 'test@diagnostico.local',
      mensaje: 'Solicitud de prueba generada por el script de diagnóstico',
    }),
    estado: 'pendiente',
    fijada: false,
  };

  const db = supabaseAdmin ?? supabase;
  const { data, error } = await db.from('publicaciones').insert(testRecord).select('id').single();

  if (error) {
    console.error('❌ INSERT fallido:', error.message, error.code);
    console.error('   Causa probable: RLS bloqueando o tabla inexistente');
  } else {
    console.info('✅ INSERT exitoso — ID:', data?.id);

    // 4. Verificar que se puede leer
    const { data: readData, error: readError } = await db
      .from('publicaciones')
      .select('id,titulo,estado')
      .eq('id', data!.id)
      .single();

    if (readError || !readData) {
      console.warn('⚠️ INSERT OK pero SELECT falla — posible problema de RLS en lectura');
    } else {
      console.info('✅ SELECT exitoso — solicitud visible');
    }

    // 5. Limpiar registro de prueba
    await db.from('publicaciones').delete().eq('id', data!.id);
    console.info('🧹 Registro de prueba eliminado');
  }

  // 6. Test edge function (submit-solicitud)
  try {
    const edgeRes = await fetch(`${supabaseUrl}/functions/v1/submit-solicitud`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({
        tipo: 'contacto',
        nombre: 'Test',
        email: 'test@test.com',
        mensaje: 'Test',
        notifyTo: 'test@test.com',
      }),
    });
    console.info(`📡 Edge function submit-solicitud: HTTP ${edgeRes.status}`);
    if (edgeRes.status === 404) console.warn('⚠️ Edge function NO desplegada — usando fallback');
    else if (edgeRes.ok) console.info('✅ Edge function funcionando correctamente');
    else {
      const detail = await edgeRes.json().catch(() => null);
      console.warn('⚠️ Edge function error:', detail);
    }
  } catch (e) {
    console.error('❌ No se pudo conectar a edge function:', e);
  }

  console.groupEnd();
  console.info('💡 Abre /app/admin → Solicitudes para verificar que la nueva solicitud apareció');
}
