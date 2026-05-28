import { supabase } from './supabase';
import type { SiteConfig, Testimonio } from '../types';

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  actoresCount: 3847,
  productosCount: 1234,
  acuerdosCount: 289,
  ventasImpacto: 124,
  telefono: '+51 076 365 000',
  email: 'info@articulacaj.pe',
  direccion: 'Cajamarca, Peru',
};

type SiteConfigRow = {
  actores_count: number | null;
  productos_count: number | null;
  acuerdos_count: number | null;
  ventas_impacto: number | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
};

type TestimonioRow = {
  id: string;
  nombre: string | null;
  cargo: string | null;
  organizacion: string | null;
  foto: string | null;
  texto: string | null;
  rating: number | null;
  activo: boolean | null;
  orden: number | null;
  created_at: string | null;
};

export async function fetchSiteContent(fallbackTestimonios: Testimonio[]) {
  const [siteConfig, testimonios] = await Promise.all([
    fetchSiteConfig(),
    fetchTestimonios(fallbackTestimonios),
  ]);

  return { siteConfig, testimonios };
}

export async function fetchSiteConfig(): Promise<SiteConfig> {
  const { data, error } = await supabase
    .from('site_config')
    .select('actores_count,productos_count,acuerdos_count,ventas_impacto,telefono,email,direccion')
    .eq('id', 'main')
    .maybeSingle();

  if (error) {
    console.warn('No se pudo cargar site_config, usando valores por defecto', error);
    return DEFAULT_SITE_CONFIG;
  }

  return siteConfigRowToConfig(data as SiteConfigRow | null);
}

export async function updateSiteConfigRemote(config: SiteConfig) {
  const { error } = await supabase
    .from('site_config')
    .upsert({
      id: 'main',
      actores_count: config.actoresCount,
      productos_count: config.productosCount,
      acuerdos_count: config.acuerdosCount,
      ventas_impacto: config.ventasImpacto,
      telefono: config.telefono,
      email: config.email,
      direccion: config.direccion,
      updated_at: new Date().toISOString(),
    });

  if (error) throw error;
}

export async function fetchTestimonios(fallback: Testimonio[]): Promise<Testimonio[]> {
  const { data, error } = await supabase
    .from('testimonios')
    .select('id,nombre,cargo,organizacion,foto,texto,rating,activo,orden,created_at')
    .order('orden', { ascending: true });

  if (error) {
    console.warn('No se pudieron cargar testimonios, usando fallback', error);
    return fallback;
  }

  const rows = (data ?? []) as TestimonioRow[];
  if (rows.length === 0) return fallback;
  return rows.map(testimonioRowToTestimonio);
}

export async function createTestimonioRemote(input: Omit<Testimonio, 'id' | 'createdAt'>) {
  const { data, error } = await supabase
    .from('testimonios')
    .insert(toTestimonioPayload(input))
    .select('id,nombre,cargo,organizacion,foto,texto,rating,activo,orden,created_at')
    .single();

  if (error) throw error;
  return testimonioRowToTestimonio(data as TestimonioRow);
}

export async function updateTestimonioRemote(id: string, input: Partial<Testimonio>) {
  const { error } = await supabase
    .from('testimonios')
    .update(toTestimonioPayload(input))
    .eq('id', id);

  if (error) throw error;
}

export async function deleteTestimonioRemote(id: string) {
  const { error } = await supabase.from('testimonios').delete().eq('id', id);
  if (error) throw error;
}

function siteConfigRowToConfig(row: SiteConfigRow | null): SiteConfig {
  if (!row) return DEFAULT_SITE_CONFIG;
  return {
    actoresCount: Number(row.actores_count ?? DEFAULT_SITE_CONFIG.actoresCount),
    productosCount: Number(row.productos_count ?? DEFAULT_SITE_CONFIG.productosCount),
    acuerdosCount: Number(row.acuerdos_count ?? DEFAULT_SITE_CONFIG.acuerdosCount),
    ventasImpacto: Number(row.ventas_impacto ?? DEFAULT_SITE_CONFIG.ventasImpacto),
    telefono: row.telefono ?? DEFAULT_SITE_CONFIG.telefono,
    email: row.email ?? DEFAULT_SITE_CONFIG.email,
    direccion: row.direccion ?? DEFAULT_SITE_CONFIG.direccion,
  };
}

function testimonioRowToTestimonio(row: TestimonioRow): Testimonio {
  return {
    id: row.id,
    nombre: row.nombre ?? '',
    cargo: row.cargo ?? '',
    organizacion: row.organizacion ?? undefined,
    foto: row.foto ?? undefined,
    texto: row.texto ?? '',
    rating: Number(row.rating ?? 5),
    activo: Boolean(row.activo),
    orden: Number(row.orden ?? 1),
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

function toTestimonioPayload(input: Partial<Testimonio>) {
  return {
    nombre: input.nombre?.trim(),
    cargo: input.cargo?.trim(),
    organizacion: input.organizacion?.trim() || null,
    foto: input.foto?.trim() || null,
    texto: input.texto?.trim(),
    rating: input.rating,
    activo: input.activo,
    orden: input.orden,
    updated_at: new Date().toISOString(),
  };
}
