/**
 * Script de prueba para el módulo de Contenidos.
 * Ejecutar desde la consola del navegador:
 *   import('/src/lib/testContent.ts').then(m => m.runContentTests())
 *
 * O desde Node con tsx:
 *   npx tsx src/lib/testContent.ts
 */

import { supabaseAdmin, supabase } from './supabase';

const db = supabaseAdmin ?? supabase;

type TestResult = { name: string; ok: boolean; detail?: string };

async function test(name: string, fn: () => Promise<void>): Promise<TestResult> {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    return { name, ok: true };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error(`  ❌ ${name} — ${detail}`);
    return { name, ok: false, detail };
  }
}

export async function runContentTests() {
  console.group('🧪 Pruebas del módulo Contenidos');
  const results: TestResult[] = [];
  let pubId = '';
  let evtId = '';

  // ── PUBLICACIONES (noticias) ──────────────────────────────────────────────

  results.push(await test('INSERT publicación (noticia)', async () => {
    const { data, error } = await db
      .from('publicaciones')
      .insert({ tipo: 'publicacion', titulo: '[TEST] Noticia de prueba', contenido: 'Contenido de prueba generado por script.', estado: 'aprobado', fijada: false })
      .select('id')
      .single();
    if (error) throw error;
    pubId = data.id;
  }));

  results.push(await test('SELECT publicación recién creada', async () => {
    const { data, error } = await db.from('publicaciones').select('id,titulo,estado').eq('id', pubId).single();
    if (error) throw error;
    if (data.titulo !== '[TEST] Noticia de prueba') throw new Error(`Título incorrecto: ${data.titulo}`);
    if (data.estado !== 'aprobado') throw new Error(`Estado incorrecto: ${data.estado}`);
  }));

  results.push(await test('UPDATE publicación (cambiar estado a pendiente)', async () => {
    const { error } = await db.from('publicaciones').update({ estado: 'pendiente', titulo: '[TEST] Noticia actualizada' }).eq('id', pubId);
    if (error) throw error;
    const { data, error: err2 } = await db.from('publicaciones').select('titulo,estado').eq('id', pubId).single();
    if (err2) throw err2;
    if (data.estado !== 'pendiente') throw new Error(`Estado no actualizado: ${data.estado}`);
    if (!data.titulo.includes('actualizada')) throw new Error('Título no actualizado');
  }));

  // ── CONVOCATORIAS ─────────────────────────────────────────────────────────

  let convId = '';
  results.push(await test('INSERT convocatoria', async () => {
    const { data, error } = await db
      .from('publicaciones')
      .insert({ tipo: 'convocatoria', titulo: '[TEST] Convocatoria de prueba', contenido: 'Bases y condiciones de prueba.', estado: 'aprobado', fijada: false })
      .select('id')
      .single();
    if (error) throw error;
    convId = data.id;
  }));

  results.push(await test('SELECT convocatorias — aparece en lista', async () => {
    const { data, error } = await db.from('publicaciones').select('id').eq('tipo', 'convocatoria').eq('id', convId).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Convocatoria no encontrada en lista');
  }));

  results.push(await test('DELETE convocatoria', async () => {
    const { error } = await db.from('publicaciones').delete().eq('id', convId);
    if (error) throw error;
  }));

  // ── EVENTOS ───────────────────────────────────────────────────────────────

  results.push(await test('INSERT evento', async () => {
    const { data, error } = await db
      .from('eventos')
      .insert({ titulo: '[TEST] Evento de prueba', descripcion: 'Descripción del evento de prueba.', fecha: '2026-12-31', lugar: 'Cajamarca', tipo: 'feria', organizador_texto: 'ARTICULA CAJ' })
      .select('id')
      .single();
    if (error) throw error;
    evtId = data.id;
  }));

  results.push(await test('SELECT evento recién creado', async () => {
    const { data, error } = await db.from('eventos').select('id,titulo,fecha,lugar').eq('id', evtId).single();
    if (error) throw error;
    if (data.fecha !== '2026-12-31') throw new Error(`Fecha incorrecta: ${data.fecha}`);
  }));

  results.push(await test('UPDATE evento (cambiar lugar)', async () => {
    const { error } = await db.from('eventos').update({ lugar: 'Plaza de Armas, Cajamarca' }).eq('id', evtId);
    if (error) throw error;
    const { data, error: err2 } = await db.from('eventos').select('lugar').eq('id', evtId).single();
    if (err2) throw err2;
    if (!data.lugar.includes('Plaza')) throw new Error('Lugar no actualizado');
  }));

  // ── LIMPIEZA ──────────────────────────────────────────────────────────────

  results.push(await test('DELETE publicación de prueba', async () => {
    const { error } = await db.from('publicaciones').delete().eq('id', pubId);
    if (error) throw error;
  }));

  results.push(await test('DELETE evento de prueba', async () => {
    const { error } = await db.from('eventos').delete().eq('id', evtId);
    if (error) throw error;
  }));

  // ── REALTIME ─────────────────────────────────────────────────────────────

  results.push(await test('Realtime publicaciones — canal conecta', async () => {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout conectando canal')), 5000);
      const ch = supabase.channel('test-pub-rt')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'publicaciones' }, () => {})
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') { clearTimeout(timeout); void supabase.removeChannel(ch); resolve(); }
          if (status === 'CHANNEL_ERROR') { clearTimeout(timeout); reject(new Error('Error canal realtime')); }
        });
    });
  }));

  results.push(await test('Realtime eventos — canal conecta', async () => {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout conectando canal')), 5000);
      const ch = supabase.channel('test-evt-rt')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'eventos' }, () => {})
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') { clearTimeout(timeout); void supabase.removeChannel(ch); resolve(); }
          if (status === 'CHANNEL_ERROR') { clearTimeout(timeout); reject(new Error('Error canal realtime')); }
        });
    });
  }));

  // ── RESUMEN ───────────────────────────────────────────────────────────────

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  console.log(`\n📊 Resultado: ${passed}/${results.length} pruebas pasaron`);
  if (failed.length > 0) {
    console.warn('Fallos:');
    failed.forEach((f) => console.warn(`  ❌ ${f.name}: ${f.detail}`));
  } else {
    console.log('🎉 Todos los tests pasaron — el módulo de Contenidos funciona correctamente.');
  }
  console.groupEnd();
  return { passed, total: results.length, failed };
}
