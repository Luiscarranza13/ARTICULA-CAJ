import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Briefcase, Calendar, Edit, Heart, MessageSquare, Save, Send, Share2, Trash2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import Badge from '../components/common/Badge';
import { fetchActores, fetchPublicaciones } from '../lib/data';
import { supabase } from '../lib/supabase';
import { classNames, initials, timeAgo } from '../lib/utils';
import { useStore } from '../store/useStore';
import type { Actor, Publicacion } from '../types';

const tabs = [
  { id: 'feed', label: 'Feed', icon: Users },
  { id: 'oportunidades', label: 'Oportunidades', icon: Briefcase },
  { id: 'eventos', label: 'Convocatorias', icon: Calendar },
];

const tipoColors: Record<string, string> = {
  publicacion: 'bg-surface-100 text-surface-600',
  oportunidad: 'bg-amber-100 text-amber-700',
  convocatoria: 'bg-blue-100 text-blue-700',
  evento: 'bg-purple-100 text-purple-700',
};

export default function ArticulationPage() {
  const { user } = useStore();
  const [activeTab, setActiveTab] = useState('feed');
  const [tipo, setTipo] = useState<Publicacion['tipo']>('publicacion');
  const [titulo, setTitulo] = useState('');
  const [contenido, setContenido] = useState('');
  const [imagen, setImagen] = useState('');
  const [editing, setEditing] = useState<Publicacion | null>(null);
  const [publications, setPublications] = useState<Publicacion[]>([]);
  const [actores, setActores] = useState<Actor[]>([]);
  const [likedPosts, setLikedPosts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [pubs, actors] = await Promise.all([fetchPublicaciones(), fetchActores()]);
      setPublications(pubs);
      setActores(actors);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cargar articulacion');
    }
    setLoading(false);
  };

  useEffect(() => {
    queueMicrotask(() => void load());
    const channel = supabase
      .channel('articulation-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'publicaciones' }, () => void load())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const visiblePubs = useMemo(() => publications.filter((pub) => !pub.titulo?.startsWith('SOLICITUD:')), [publications]);

  const filteredPubs = useMemo(() => activeTab === 'oportunidades'
    ? visiblePubs.filter((pub) => pub.tipo === 'oportunidad')
    : activeTab === 'eventos'
      ? visiblePubs.filter((pub) => ['convocatoria', 'evento'].includes(pub.tipo))
      : visiblePubs, [activeTab, visiblePubs]);

  const resetForm = () => {
    setTipo('publicacion');
    setTitulo('');
    setContenido('');
    setImagen('');
    setEditing(null);
  };

  const savePost = async () => {
    if (!contenido.trim()) return;
    const payload = {
      autor_id: user?.id ?? null,
      tipo,
      titulo: titulo || null,
      contenido,
      imagen_url: imagen || null,
      estado: user?.rol === 'administrador' ? 'aprobado' : 'pendiente',
      fijada: false,
    };
    const result = editing
      ? await supabase.from('publicaciones').update(payload).eq('id', editing.id)
      : await supabase.from('publicaciones').insert(payload);

    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    toast.success(editing ? 'Publicacion actualizada' : 'Publicacion creada');
    resetForm();
    await load();
  };

  const editPost = (pub: Publicacion) => {
    setEditing(pub);
    setTipo(pub.tipo);
    setTitulo(pub.titulo ?? '');
    setContenido(pub.contenido);
    setImagen(pub.imagenes?.[0] ?? '');
  };

  const deletePost = async (pub: Publicacion) => {
    const { error } = await supabase.from('publicaciones').delete().eq('id', pub.id);
    if (error) toast.error(error.message);
    else {
      toast.success('Publicacion eliminada');
      setPublications((prev) => prev.filter((p) => p.id !== pub.id));
    }
  };

  const handleLike = (id: string) => setLikedPosts((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);

  return (
    <div className="max-w-[1200px] grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-5">
        <div className="card p-1 flex gap-1">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={classNames('flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all', activeTab === tab.id ? 'bg-emerald-600 text-white shadow-emerald' : 'text-surface-600 hover:bg-surface-100')}>
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">{initials(user?.nombre ?? 'U', user?.apellido)}</div>
            <div className="flex-1 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select aria-label="Tipo de publicacion" className="input-field py-2" value={tipo} onChange={(event) => setTipo(event.target.value as Publicacion['tipo'])}>
                  <option value="publicacion">Publicacion</option>
                  <option value="oportunidad">Oportunidad</option>
                  <option value="convocatoria">Convocatoria</option>
                  <option value="evento">Evento</option>
                </select>
                <input className="input-field py-2" placeholder="Titulo opcional" value={titulo} onChange={(event) => setTitulo(event.target.value)} />
              </div>
              <textarea value={contenido} onChange={(event) => setContenido(event.target.value)} placeholder="Que quieres compartir con la red productiva?" className="input-field resize-none" rows={3} />
              <input className="input-field py-2" placeholder="URL de imagen opcional" value={imagen} onChange={(event) => setImagen(event.target.value)} />
              <div className="flex items-center justify-end gap-3 pt-2">
                {editing && <button className="btn-secondary py-2 text-xs" onClick={resetForm}>Cancelar</button>}
                <button onClick={savePost} disabled={!contenido.trim()} className="btn-primary py-2 px-4 text-xs disabled:opacity-50">
                  {editing ? <Save className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                  {editing ? 'Guardar' : 'Publicar'}
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {loading ? <div className="card p-8 text-center text-surface-400">Cargando publicaciones...</div> : (
          <div className="space-y-4">
            {filteredPubs.map((pub, index) => (
              <motion.div key={pub.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }} className="card p-5 hover:shadow-card-hover transition-all">
                <div className="flex items-start gap-3 mb-4">
                  {pub.autorAvatar ? <img src={pub.autorAvatar} alt={pub.autorNombre} className="w-10 h-10 rounded-xl object-cover" /> : <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">{initials(pub.autorNombre)}</div>}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-surface-900 text-sm">{pub.autorNombre}</span>
                      <Badge variant={pub.autorRol === 'productor' ? 'emerald' : pub.autorRol === 'comprador' ? 'blue' : 'purple'}>{pub.autorRol}</Badge>
                      <span className={classNames('px-2 py-0.5 rounded-full text-xs font-medium', tipoColors[pub.tipo])}>{pub.tipo}</span>
                    </div>
                    <p className="text-xs text-surface-400 mt-0.5">{timeAgo(pub.createdAt)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button aria-label="Editar publicacion" onClick={() => editPost(pub)} className="text-surface-400 hover:text-emerald-700"><Edit className="w-4 h-4" /></button>
                    <button aria-label="Eliminar publicacion" onClick={() => deletePost(pub)} className="text-surface-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                {pub.titulo && <h3 className="font-display font-bold text-surface-900 mb-2">{pub.titulo}</h3>}
                <p className="text-surface-700 text-sm leading-relaxed mb-4">{pub.contenido}</p>
                {pub.imagenes?.[0] && <img src={pub.imagenes[0]} alt="" className="w-full h-48 object-cover rounded-2xl mb-4" />}
                <div className="flex items-center gap-1 pt-3 border-t border-surface-100">
                  <button onClick={() => handleLike(pub.id)} className={classNames('flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm hover:bg-surface-50', likedPosts.includes(pub.id) ? 'text-red-500 font-medium' : 'text-surface-500')}>
                    <Heart className={classNames('w-4 h-4', likedPosts.includes(pub.id) && 'fill-current')} />{likedPosts.includes(pub.id) ? 1 : 0}
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-surface-500 hover:bg-surface-50"><MessageSquare className="w-4 h-4" />0</button>
                  <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-surface-500 hover:bg-surface-50"><Share2 className="w-4 h-4" />0</button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-5">
        <div className="card p-5">
          <h3 className="font-display font-semibold text-surface-900 mb-4">Actores para conectar</h3>
          <div className="space-y-3">
            {actores.slice(0, 5).map((actor) => (
              <div key={actor.id} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-surface-100 overflow-hidden flex items-center justify-center font-bold text-emerald-700">{actor.nombre.slice(0, 2).toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-surface-800 truncate">{actor.nombre}</p>
                  <p className="text-xs text-surface-400 truncate">{actor.rubro} · {actor.distrito}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <h3 className="font-display font-semibold text-surface-900 mb-4">Actividad en vivo</h3>
          <div className="space-y-3 text-sm">
            <Metric icon={Users} label="Actores" value={actores.length} />
            <Metric icon={Briefcase} label="Oportunidades" value={visiblePubs.filter((pub) => pub.tipo === 'oportunidad').length} />
            <Metric icon={Bell} label="Convocatorias" value={visiblePubs.filter((pub) => ['convocatoria', 'evento'].includes(pub.tipo)).length} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center"><Icon className="w-4 h-4" /></div>
      <span className="text-surface-600 flex-1">{label}</span>
      <span className="font-bold text-surface-900">{value}</span>
    </div>
  );
}
