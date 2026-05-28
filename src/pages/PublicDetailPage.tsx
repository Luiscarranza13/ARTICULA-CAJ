import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Bell, Calendar, Clock, Leaf, Link2,
  MapPin, Newspaper, Share2, Users,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

// ── Tipos ────────────────────────────────────────────────────────────────────

type DetailType = 'noticia' | 'evento' | 'convocatoria';

type DetailData = {
  id: string;
  tipo: DetailType;
  titulo: string;
  contenido: string;
  imagen_url: string | null;
  createdAt: string;
  // Publicaciones
  autorNombre?: string;
  autorAvatar?: string | null;
  autorCargo?: string;
  // Eventos
  fecha?: string;
  hora?: string;
  lugar?: string;
  organizador?: string;
  cupos?: number | null;
};

// ── Imagen con fallback ───────────────────────────────────────────────────────
function SafeImg({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
}

// ── Placeholder de imagen ─────────────────────────────────────────────────────
function ImgPlaceholder({ tipo }: { tipo: DetailType }) {
  const map: Record<DetailType, { Icon: typeof Newspaper; bg: string; color: string }> = {
    noticia:      { Icon: Newspaper, bg: 'from-emerald-100 to-emerald-200', color: 'text-emerald-400' },
    evento:       { Icon: Calendar,  bg: 'from-blue-100 to-indigo-200',     color: 'text-blue-400' },
    convocatoria: { Icon: Bell,      bg: 'from-amber-100 to-amber-200',     color: 'text-amber-400' },
  };
  const { Icon, bg, color } = map[tipo];
  return (
    <div className={`w-full h-72 bg-gradient-to-br ${bg} flex items-center justify-center`}>
      <Icon className={`w-20 h-20 ${color} opacity-50`} />
    </div>
  );
}

// ── Badge de tipo ─────────────────────────────────────────────────────────────
function TypeBadge({ tipo }: { tipo: DetailType }) {
  const map: Record<DetailType, { label: string; cls: string; Icon: typeof Newspaper }> = {
    noticia:      { label: 'Noticia',      cls: 'bg-emerald-100 text-emerald-700', Icon: Newspaper },
    evento:       { label: 'Evento',       cls: 'bg-blue-100 text-blue-700',       Icon: Calendar },
    convocatoria: { label: 'Convocatoria', cls: 'bg-amber-100 text-amber-700',     Icon: Bell },
  };
  const { label, cls, Icon } = map[tipo];
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${cls}`}>
      <Icon className="w-3.5 h-3.5" />{label}
    </span>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function PublicDetailPage() {
  const { tipo, id } = useParams<{ tipo: string; id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<DetailData | null>(null);
  const [related, setRelated] = useState<DetailData[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  const detailTipo = tipo as DetailType;

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!id || !tipo) { setNotFound(true); setLoading(false); return; }

    const load = async () => {
      setLoading(true);
      try {
        if (tipo === 'evento') {
          const { data: ev, error } = await supabase
            .from('eventos')
            .select('id,titulo,descripcion,fecha,hora,lugar,tipo,imagen_url,organizador_texto,cupos')
            .eq('id', id)
            .maybeSingle();

          if (error || !ev) { setNotFound(true); return; }

          setData({
            id: ev.id,
            tipo: 'evento',
            titulo: ev.titulo ?? '',
            contenido: ev.descripcion ?? '',
            imagen_url: ev.imagen_url ?? null,
            createdAt: ev.fecha ?? new Date().toISOString(),
            fecha: ev.fecha ?? undefined,
            hora: ev.hora ?? undefined,
            lugar: ev.lugar ?? undefined,
            organizador: ev.organizador_texto ?? 'ARTICULA CAJ',
            cupos: ev.cupos ?? null,
          });

          // Relacionados: otros eventos
          const { data: rel } = await supabase
            .from('eventos')
            .select('id,titulo,descripcion,fecha,imagen_url')
            .neq('id', id).limit(3);

          setRelated(((rel ?? []) as { id: string; titulo: string | null; descripcion: string | null; fecha: string | null; imagen_url: string | null }[]).map((r) => ({
            id: r.id, tipo: 'evento' as DetailType,
            titulo: r.titulo ?? '', contenido: r.descripcion ?? '',
            imagen_url: r.imagen_url, createdAt: r.fecha ?? '',
          })));

        } else {
          // Publicación (noticia o convocatoria)
          const pubTipo = tipo === 'convocatoria' ? 'convocatoria' : 'publicacion';
          const { data: pub, error } = await supabase
            .from('publicaciones')
            .select('id,titulo,contenido,imagen_url,created_at,autor_id,tipo')
            .eq('id', id)
            .eq('estado', 'aprobado')
            .maybeSingle();

          if (error || !pub) { setNotFound(true); return; }

          // Datos del autor
          let autorNombre = 'ARTICULA CAJ';
          let autorAvatar: string | null = null;
          if (pub.autor_id) {
            const { data: perfil } = await supabase
              .from('perfiles')
              .select('nombre,apellido,avatar_url,rubro_texto')
              .eq('id', pub.autor_id)
              .maybeSingle();
            if (perfil) {
              autorNombre = `${perfil.nombre ?? ''} ${perfil.apellido ?? ''}`.trim() || 'ARTICULA CAJ';
              autorAvatar = perfil.avatar_url ?? null;
            }
          }

          setData({
            id: pub.id,
            tipo: (pub.tipo === 'convocatoria' ? 'convocatoria' : 'noticia') as DetailType,
            titulo: pub.titulo ?? '',
            contenido: pub.contenido ?? '',
            imagen_url: pub.imagen_url ?? null,
            createdAt: pub.created_at ?? new Date().toISOString(),
            autorNombre,
            autorAvatar,
          });

          // Relacionados
          const { data: rel } = await supabase
            .from('publicaciones')
            .select('id,titulo,contenido,imagen_url,created_at')
            .eq('tipo', pubTipo).eq('estado', 'aprobado')
            .neq('id', id).limit(3);

          setRelated(((rel ?? []) as { id: string; titulo: string | null; contenido: string | null; imagen_url: string | null; created_at: string | null }[]).map((r) => ({
            id: r.id, tipo: (pubTipo === 'convocatoria' ? 'convocatoria' : 'noticia') as DetailType,
            titulo: r.titulo ?? '(Sin título)', contenido: r.contenido ?? '',
            imagen_url: r.imagen_url, createdAt: r.created_at ?? '',
          })));
        }
      } catch (err) {
        console.error('Error cargando detalle:', err);
        setNotFound(true);
      }
      setLoading(false);
    };

    queueMicrotask(() => void load());
  }, [id, tipo]);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback silencioso
    }
  };

  // ── Navbar ─────────────────────────────────────────────────────────────────
  const Navbar = () => (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-surface-100 shadow-sm">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/logo.jpeg" alt="ARTICULA CAJ" className="w-8 h-8 rounded-xl object-cover shadow-sm" />
          <div>
            <span className="font-display font-bold text-surface-900">ARTICULA</span>
            <span className="font-display font-bold ml-1 text-emerald-600">CAJ</span>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-surface-500 hover:text-surface-900 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>
          <Link to="/login"
            className="px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors">
            Iniciar sesión
          </Link>
        </div>
      </div>
    </nav>
  );

  // ── Not found ───────────────────────────────────────────────────────────────
  if (notFound) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-surface-50 flex items-center justify-center pt-16">
          <div className="text-center">
            <Leaf className="w-16 h-16 text-emerald-300 mx-auto mb-4" />
            <h1 className="font-display text-2xl font-bold text-surface-900 mb-2">Contenido no encontrado</h1>
            <p className="text-surface-500 mb-6">Este contenido no existe o no está disponible públicamente.</p>
            <Link to="/#contenidos" className="btn-primary">Volver al inicio</Link>
          </div>
        </div>
      </>
    );
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading || !data) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-surface-50 flex items-center justify-center pt-16">
          <div className="w-10 h-10 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" />
        </div>
      </>
    );
  }

  const formattedDate = data.createdAt
    ? new Date(data.createdAt).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-surface-50 pt-16">
        <div className="max-w-4xl mx-auto px-6 py-12">

          {/* Breadcrumb */}
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-sm text-surface-400 mb-8">
            <Link to="/" className="hover:text-emerald-600 transition-colors">Inicio</Link>
            <span>/</span>
            <Link to="/#contenidos" className="hover:text-emerald-600 transition-colors capitalize">
              {detailTipo === 'noticia' ? 'Noticias' : detailTipo === 'evento' ? 'Eventos' : 'Convocatorias'}
            </Link>
            <span>/</span>
            <span className="text-surface-600 truncate max-w-xs">{data.titulo || 'Detalle'}</span>
          </motion.div>

          {/* Artículo principal */}
          <motion.article initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-surface-200 overflow-hidden shadow-card-hover mb-10">

            {/* Imagen hero */}
            {data.imagen_url ? (
              <div className="relative h-72 md:h-96 overflow-hidden bg-surface-100">
                <SafeImg src={data.imagen_url} alt={data.titulo}
                  className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              </div>
            ) : (
              <ImgPlaceholder tipo={detailTipo} />
            )}

            <div className="p-8 md:p-12">
              {/* Tipo + fecha */}
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <TypeBadge tipo={detailTipo} />
                <span className="text-sm text-surface-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="capitalize">{formattedDate}</span>
                </span>
              </div>

              {/* Título */}
              {data.titulo && (
                <h1 className="font-display text-3xl md:text-4xl font-bold text-surface-900 mb-6 leading-tight">
                  {data.titulo}
                </h1>
              )}

              {/* Autor (publicaciones) */}
              {data.autorNombre && (
                <div className="flex items-center gap-3 mb-8 pb-8 border-b border-surface-100">
                  {data.autorAvatar ? (
                    <SafeImg src={data.autorAvatar} alt={data.autorNombre}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-100" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {data.autorNombre.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-surface-800 text-sm">{data.autorNombre}</p>
                    <p className="text-xs text-emerald-600">ARTICULA CAJ</p>
                  </div>
                  <button type="button" onClick={handleShare}
                    className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl border border-surface-200 text-sm text-surface-500 hover:border-emerald-300 hover:text-emerald-700 transition-all">
                    <Share2 className="w-4 h-4" />
                    {copied ? '¡Copiado!' : 'Compartir'}
                  </button>
                </div>
              )}

              {/* Detalles del evento */}
              {detailTipo === 'evento' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 p-6 bg-surface-50 rounded-2xl border border-surface-100">
                  {data.fecha && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-surface-400 font-medium uppercase tracking-wide">Fecha</p>
                        <p className="font-semibold text-surface-800">
                          {new Date(data.fecha).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  )}
                  {data.hora && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-surface-400 font-medium uppercase tracking-wide">Hora</p>
                        <p className="font-semibold text-surface-800">{data.hora}</p>
                      </div>
                    </div>
                  )}
                  {data.lugar && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-surface-400 font-medium uppercase tracking-wide">Lugar</p>
                        <p className="font-semibold text-surface-800">{data.lugar}</p>
                      </div>
                    </div>
                  )}
                  {data.organizador && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-surface-400 font-medium uppercase tracking-wide">Organizador</p>
                        <p className="font-semibold text-surface-800">{data.organizador}</p>
                      </div>
                    </div>
                  )}
                  {data.cupos != null && (
                    <div className="flex items-center gap-3 sm:col-span-2">
                      <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-surface-400 font-medium uppercase tracking-wide">Cupos disponibles</p>
                        <p className="font-semibold text-surface-800">{data.cupos} personas</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Contenido */}
              {data.contenido && data.contenido !== '📷' && (
                <div className="prose prose-emerald max-w-none text-surface-700 leading-relaxed text-base whitespace-pre-wrap">
                  {data.contenido}
                </div>
              )}

              {/* CTA */}
              <div className="mt-10 pt-8 border-t border-surface-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-surface-800">¿Quieres participar en la red?</p>
                  <p className="text-xs text-surface-500 mt-0.5">Únete a ARTICULA CAJ y conecta con productores e instituciones.</p>
                </div>
                <div className="flex gap-3 flex-shrink-0">
                  <button type="button" onClick={handleShare}
                    className="btn-secondary text-sm py-2">
                    <Share2 className="w-4 h-4" />{copied ? '¡Enlace copiado!' : 'Compartir'}
                  </button>
                  <Link to="/login" className="btn-primary text-sm py-2">
                    <Link2 className="w-4 h-4" />Unirme a la red
                  </Link>
                </div>
              </div>
            </div>
          </motion.article>

          {/* Contenido relacionado */}
          {related.length > 0 && (
            <section>
              <h2 className="font-display text-xl font-bold text-surface-900 mb-5">
                {detailTipo === 'evento' ? 'Más eventos' : detailTipo === 'convocatoria' ? 'Más convocatorias' : 'Más noticias'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {related.map((item) => (
                  <Link key={item.id} to={`/contenido/${item.tipo}/${item.id}`}
                    className="bg-white rounded-2xl border border-surface-200 overflow-hidden hover:shadow-card-hover transition-all group">
                    <div className="h-36 overflow-hidden bg-surface-100">
                      {item.imagen_url ? (
                        <SafeImg src={item.imagen_url} alt={item.titulo}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <ImgPlaceholder tipo={item.tipo} />
                      )}
                    </div>
                    <div className="p-4">
                      <TypeBadge tipo={item.tipo} />
                      <h3 className="font-display font-bold text-surface-900 text-sm mt-2 line-clamp-2">{item.titulo}</h3>
                      <p className="text-xs text-surface-500 mt-1 line-clamp-2">{item.contenido}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer mínimo */}
        <footer className="bg-white border-t border-surface-100 py-8 mt-8">
          <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-surface-400">
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo.jpeg" alt="ARTICULA CAJ" className="w-6 h-6 rounded-lg object-cover" />
              <span className="font-semibold text-surface-600">ARTICULA CAJ</span>
            </Link>
            <p>© 2026 Plataforma de Cadenas Productivas de Cajamarca</p>
            <Link to="/login" className="text-emerald-600 hover:text-emerald-700 font-medium">Iniciar sesión →</Link>
          </div>
        </footer>
      </div>
    </>
  );
}
