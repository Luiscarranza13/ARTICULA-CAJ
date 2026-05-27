import { supabase, type PerfilRow, perfilToUser } from './supabase';
import type { Actor, Evento, Producto, Publicacion } from '../types';

type ProductRow = {
  id: string;
  actor_id: string | null;
  categoria_id: string | null;
  nombre: string | null;
  descripcion: string | null;
  precio: number | null;
  unidad: string | null;
  disponibilidad: number | null;
  temporada: string | null;
  destacado: boolean | null;
  estado: string | null;
  publicado: boolean | null;
  created_at: string | null;
};

type ActorRow = {
  id: string;
  nombre: string | null;
  tipo: Actor['tipo'] | null;
  rubro_texto: string | null;
  ubicacion_texto: string | null;
  provincia_texto: string | null;
  descripcion: string | null;
  productos: string[] | null;
  contacto: string | null;
  correo: string | null;
  capacidad_productiva: string | null;
  logo_url: string | null;
  verificado: boolean | null;
  estado: string | null;
  miembros: number | null;
  fundado: number | null;
  propietario_id: string | null;
  created_at: string | null;
};

type CategoryRow = { id: string; nombre: string | null };
type ImageRow = { producto_id: string; url: string | null; alt: string | null; orden: number | null };
type PublicationRow = {
  id: string;
  autor_id: string | null;
  tipo: Publicacion['tipo'] | null;
  titulo: string | null;
  contenido: string | null;
  imagen_url: string | null;
  estado: string | null;
  fijada: boolean | null;
  created_at: string | null;
};
type EventRow = {
  id: string;
  titulo: string | null;
  descripcion: string | null;
  fecha: string | null;
  hora: string | null;
  lugar: string | null;
  tipo: string | null;
  organizador_texto: string | null;
  imagen_url: string | null;
  cupos: number | null;
  categoria: string | null;
};

export type PublicLandingKpis = {
  productores_activos?: number | null;
  productos_publicados?: number | null;
  acuerdos_comerciales?: number | null;
  ventas_cerradas?: number | null;
};

export type PublicLandingCadena = {
  id: string;
  nombre: string;
  categoria: string | null;
  estado?: string | null;
  actores: number | null;
  volumen_anual: number | null;
  impacto_economico: number | null;
};

const fallbackImage = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=80';

export async function fetchDashboardData() {
  const [kpis, cadenas, publicaciones, eventos] = await Promise.all([
    supabase.from('v_dashboard_kpis').select('*').maybeSingle(),
    supabase.from('v_cadenas_resumen').select('*').limit(6),
    fetchPublicaciones(5),
    fetchEventos(3),
  ]);

  if (kpis.error) throw kpis.error;
  if (cadenas.error) throw cadenas.error;
  return {
    kpis: kpis.data,
    cadenas: cadenas.data ?? [],
    publicaciones,
    eventos,
  };
}

export async function fetchPublicLandingData() {
  const [kpis, cadenas] = await Promise.all([
    supabase.from('v_dashboard_kpis').select('*').maybeSingle(),
    supabase
      .from('v_cadenas_resumen')
      .select('id,nombre,categoria,estado,actores,volumen_anual,impacto_economico')
      .order('actores', { ascending: false }),
  ]);

  if (kpis.error) throw kpis.error;
  if (cadenas.error) throw cadenas.error;

  return {
    kpis: (kpis.data ?? {}) as PublicLandingKpis,
    cadenas: (cadenas.data ?? []) as PublicLandingCadena[],
  };
}

export async function fetchActores(): Promise<Actor[]> {
  const { data, error } = await supabase
    .from('actores')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return ((data ?? []) as ActorRow[]).map(actorRowToActor);
}

export async function fetchProductos(): Promise<{ productos: Producto[]; categorias: string[]; actores: Actor[] }> {
  const [productsRes, categoriesRes, imagesRes, actors] = await Promise.all([
    supabase.from('productos').select('*').order('created_at', { ascending: false }),
    supabase.from('categorias_producto').select('id,nombre').order('nombre'),
    supabase.from('producto_imagenes').select('producto_id,url,alt,orden').order('orden'),
    fetchActores(),
  ]);

  if (productsRes.error) throw productsRes.error;
  if (categoriesRes.error) throw categoriesRes.error;
  if (imagesRes.error) throw imagesRes.error;

  const categories = ((categoriesRes.data ?? []) as CategoryRow[]);
  const categoryById = new Map(categories.map((category) => [category.id, category.nombre ?? 'Sin categoria']));
  const actorById = new Map(actors.map((actor) => [actor.id, actor]));
  const imagesByProduct = groupBy((imagesRes.data ?? []) as ImageRow[], (image) => image.producto_id);

  return {
    productos: ((productsRes.data ?? []) as ProductRow[]).map((product) => {
      const actor = product.actor_id ? actorById.get(product.actor_id) : undefined;
      const images = (imagesByProduct.get(product.id) ?? []).map((image) => image.url).filter(Boolean) as string[];
      return {
        id: product.id,
        nombre: product.nombre ?? '',
        descripcion: product.descripcion ?? '',
        precio: Number(product.precio ?? 0),
        unidad: product.unidad ?? 'unidad',
        cantidad: Number(product.disponibilidad ?? 0),
        disponibilidad: product.publicado === false ? 'agotado' : Number(product.disponibilidad ?? 0) > 0 ? 'disponible' : 'agotado',
        temporada: product.temporada ?? undefined,
        categoria: product.categoria_id ? categoryById.get(product.categoria_id) ?? 'Sin categoria' : 'Sin categoria',
        certificaciones: [],
        imagenes: images.length > 0 ? images : [fallbackImage],
        productoId: product.actor_id ?? '',
        ubicacion: actor?.ubicacion ?? actor?.distrito ?? 'Cajamarca',
        destacado: Boolean(product.destacado),
        createdAt: product.created_at ?? new Date().toISOString(),
        tags: product.estado ? [product.estado] : [],
      };
    }),
    categorias: ['Todos', ...categories.map((category) => category.nombre ?? 'Sin categoria')],
    actores: actors,
  };
}

export async function fetchPublicaciones(limit = 50): Promise<Publicacion[]> {
  const [pubsRes, profilesRes] = await Promise.all([
    supabase.from('publicaciones').select('*').order('created_at', { ascending: false }).limit(limit),
    supabase.from('perfiles').select('*'),
  ]);

  if (pubsRes.error) throw pubsRes.error;
  if (profilesRes.error) throw profilesRes.error;

  const profileById = new Map(((profilesRes.data ?? []) as PerfilRow[]).map((profile) => [profile.id, perfilToUser(profile)]));
  return ((pubsRes.data ?? []) as PublicationRow[]).map((pub) => {
    const author = pub.autor_id ? profileById.get(pub.autor_id) : undefined;
    return {
      id: pub.id,
      autorId: pub.autor_id ?? '',
      autorNombre: author ? `${author.nombre} ${author.apellido}`.trim() : 'ARTICULA CAJ',
      autorAvatar: author?.avatar,
      autorRol: author?.rol ?? 'institucion',
      tipo: pub.tipo ?? 'publicacion',
      titulo: pub.titulo ?? undefined,
      contenido: pub.contenido ?? '',
      imagenes: pub.imagen_url ? [pub.imagen_url] : undefined,
      likes: 0,
      comentarios: 0,
      compartidos: 0,
      tags: pub.estado ? [pub.estado] : [],
      createdAt: pub.created_at ?? new Date().toISOString(),
    };
  });
}

export async function fetchEventos(limit = 20): Promise<Evento[]> {
  const { data, error } = await supabase
    .from('eventos')
    .select('*')
    .order('fecha', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return ((data ?? []) as EventRow[]).map((event) => ({
    id: event.id,
    titulo: event.titulo ?? '',
    descripcion: event.descripcion ?? '',
    fecha: event.fecha ?? new Date().toISOString(),
    horaInicio: event.hora ?? '',
    lugar: event.lugar ?? '',
    organizador: event.organizador_texto ?? 'ARTICULA CAJ',
    tipo: isEventoTipo(event.tipo) ? event.tipo : 'convocatoria',
    imagen: event.imagen_url ?? undefined,
    cupos: event.cupos ?? undefined,
    inscritos: 0,
    gratuito: true,
    tags: event.categoria ? [event.categoria] : [],
  }));
}

export async function firstCategoriaId() {
  const { data, error } = await supabase.from('categorias_producto').select('id').limit(1).single();
  if (error) throw error;
  return data.id as string;
}

export function actorRowToActor(row: ActorRow): Actor {
  return {
    id: row.id,
    nombre: row.nombre ?? '',
    tipo: row.tipo ?? 'empresa',
    rubro: row.rubro_texto ?? 'General',
    ubicacion: row.ubicacion_texto ?? row.provincia_texto ?? 'Cajamarca',
    distrito: row.ubicacion_texto ?? 'Cajamarca',
    descripcion: row.descripcion ?? '',
    logo: row.logo_url ?? undefined,
    capacidadProductiva: row.capacidad_productiva ?? undefined,
    contacto: {
      telefono: row.contacto ?? '',
      correo: row.correo ?? '',
    },
    productos: row.productos ?? [],
    certificaciones: [],
    miembros: row.miembros ?? undefined,
    anoFundacion: row.fundado ?? undefined,
    tags: row.estado ? [row.estado] : [],
    verificado: Boolean(row.verificado),
  };
}

function groupBy<T, K>(items: T[], keyFn: (item: T) => K) {
  const groups = new Map<K, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return groups;
}

function isEventoTipo(tipo: string | null): tipo is Evento['tipo'] {
  return tipo === 'capacitacion' || tipo === 'feria' || tipo === 'reunion' || tipo === 'taller' || tipo === 'convocatoria';
}
