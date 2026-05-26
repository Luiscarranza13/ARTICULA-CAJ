export type UserRole = 'productor' | 'comprador' | 'institucion' | 'administrador';

export interface User {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  celular: string;
  correo: string;
  organizacion?: string;
  ubicacion: string;
  rubro?: string;
  rol: UserRole;
  avatar?: string;
  verified: boolean;
  createdAt: string;
  bio?: string;
}

export interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  unidad: string;
  cantidad: number;
  disponibilidad: 'disponible' | 'agotado' | 'temporada';
  temporada?: string;
  categoria: string;
  subcategoria?: string;
  certificaciones: string[];
  imagenes: string[];
  productoId: string;
  ubicacion: string;
  destacado: boolean;
  createdAt: string;
  tags: string[];
}

export interface Actor {
  id: string;
  nombre: string;
  tipo: 'productor' | 'asociacion' | 'cooperativa' | 'empresa' | 'institucion';
  rubro: string;
  ubicacion: string;
  distrito: string;
  descripcion: string;
  logo?: string;
  capacidadProductiva?: string;
  contacto: { telefono: string; correo: string; web?: string };
  productos: string[];
  certificaciones: string[];
  miembros?: number;
  hectareas?: number;
  anoFundacion?: number;
  tags: string[];
  verificado: boolean;
}

export interface Publicacion {
  id: string;
  autorId: string;
  autorNombre: string;
  autorAvatar?: string;
  autorRol: UserRole;
  tipo: 'publicacion' | 'oportunidad' | 'convocatoria' | 'evento';
  titulo?: string;
  contenido: string;
  imagenes?: string[];
  likes: number;
  comentarios: number;
  compartidos: number;
  liked?: boolean;
  tags: string[];
  createdAt: string;
}

export interface Evento {
  id: string;
  titulo: string;
  descripcion: string;
  fecha: string;
  horaInicio: string;
  horaFin?: string;
  lugar: string;
  organizador: string;
  tipo: 'capacitacion' | 'feria' | 'reunion' | 'taller' | 'convocatoria';
  imagen?: string;
  cupos?: number;
  inscritos: number;
  gratuito: boolean;
  tags: string[];
}

export interface Notificacion {
  id: string;
  tipo: 'mensaje' | 'conexion' | 'oportunidad' | 'evento' | 'sistema';
  titulo: string;
  descripcion: string;
  leida: boolean;
  createdAt: string;
  link?: string;
}

export interface CadenaProductiva {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  actores: number;
  produccion: number;
  unidad: string;
  impacto: string;
  color: string;
  icon: string;
  distritos: string[];
  tendencia: 'up' | 'down' | 'stable';
  porcentajeCambio: number;
}

export interface KPI {
  id: string;
  titulo: string;
  valor: string;
  cambio: number;
  tendencia: 'up' | 'down' | 'stable';
  descripcion: string;
  icon: string;
  color: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AppState {
  darkMode: boolean;
  sidebarOpen: boolean;
  notifications: Notificacion[];
  unreadCount: number;
}

export interface Testimonio {
  id: string;
  nombre: string;
  cargo: string;
  organizacion?: string;
  foto?: string;
  texto: string;
  rating: number;
  activo: boolean;
  orden: number;
  createdAt: string;
}

export interface SiteConfig {
  actoresCount: number;
  productosCount: number;
  acuerdosCount: number;
  ventasImpacto: number;
  telefono: string;
  email: string;
  direccion: string;
}

export type SolicitudTipo = 'contacto' | 'adquisicion';
export type SolicitudEstado = 'pendiente' | 'en_proceso' | 'resuelto' | 'cancelado';
export type SolicitudPrioridad = 'baja' | 'media' | 'alta';

export interface Solicitud {
  id: string;
  tipo: SolicitudTipo;
  nombre: string;
  email: string;
  telefono?: string;
  empresa?: string;
  producto?: string;
  cadena?: string;
  cantidad?: string;
  presupuesto?: string;
  mensaje: string;
  estado: SolicitudEstado;
  prioridad: SolicitudPrioridad;
  createdAt: string;
  updatedAt: string;
  notas?: string;
  atendidoPor?: string;
}
