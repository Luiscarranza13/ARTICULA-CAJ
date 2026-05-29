import { createPortal } from 'react-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell, Briefcase, Calendar, Edit, Heart, ImagePlus, MessageSquare,
  Plus, Save, Send, Share2, Trash2, Users, X, AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Badge from '../components/common/Badge';
import { fetchActores, fetchPublicaciones } from '../lib/data';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { classNames, initials, timeAgo } from '../lib/utils';
import { useStore } from '../store/useStore';
import type { Actor, Publicacion } from '../types';

const db = supabaseAdmin ?? supabase;

const tabs = [
  { id: 'feed',          label: 'Feed',          icon: Users },
  { id: 'oportunidades', label: 'Oportunidades', icon: Briefcase },
  { id: 'eventos',       label: 'Convocatorias', icon: Calendar },
];

const tipoColors: Record<string, string> = {
  publicacion:  'bg-surface-100 text-surface-600',
  oportunidad:  'bg-amber-100 text-amber-700',
  convocatoria: 'bg-blue-100 text-blue-700',
  evento:       'bg-purple-100 text-purple-700',
};

type PostTipo = Publicacion['tipo'];

const tipoLabels: Record<PostTipo, string> = {
  publicacion:  'Publicación',
  oportunidad:  'Oportunidad',
  convocatoria: 'Convocatoria',
  evento:       'Evento',
};

const EMPTY_FORM = { tipo: 'publicacion' as PostTipo, titulo: '', contenido: '', fecha: '' };

export default function ArticulationPage() {
  const { user } = useStore();
  const [activeTab, setActiveTab] = useState('feed');
  const [publications, setPublications] = useState<Publicacion[]>([]);
  const [actores, setActores] = useState<Actor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Publicacion | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Publicacion | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isAdmin = user?.rol === 'administrador';
  const canEdit = (pub: Publicacion) => isAdmin || pub.autorId === user?.id;

  const load = async () => {
    setLoading(true);
    try {
      const [pubs, actors] = await Promise.all([fetchPublicaciones(), fetchActores()]);
      setPublications(pubs);
      setActores(actors);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cargar articulación');
    }
    setLoading(false);
  };

  useEffect(() => {
    queueMicrotask(() => void load());
    const channel = supabase
      .channel('articulation-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'publicaciones' }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, []);

  const visiblePubs = useMemo(
    () => publications.filter((p) => !p.titulo?.startsWith('SOLICITUD:')),
    [publications],
  );

  const filteredPubs = useMemo(() => {
    if (activeTab === 'oportunidades') return visiblePubs.filter((p) => p.tipo === 'oportunidad');
    if (activeTab === 'eventos') return visiblePubs.filter((p) => ['convocatoria', 'evento'].includes(p.tipo));
    return visiblePubs;
  }, [activeTab, visiblePubs]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setImageFile(null);
    setImagePreview('');
    setShowModal(true);
  };

  const openEdit = (pub: Publicacion) => {
    setEditing(pub);
    setForm({ tipo: pub.tipo, titulo: pub.titulo ?? '', contenido: pub.contenido, fecha: '' });
    setImagePreview(pub.imagenes?.[0] ?? '');
    setImageFile(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setImageFile(null);
    setImagePreview('');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('La imagen no puede superar 5 MB'); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile || !user?.id) return null;
    const ext = imageFile.name.split('.').pop() ?? 'jpg';
    const path = `publicaciones/${user.id}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, imageFile, { upsert: true });
    if (error) { toast.error(`Error al subir imagen: ${error.message}`); return null; }
    return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
  };

  const savePost = async () => {
    const hasContent = form.contenido.trim() || imageFile || imagePreview;
    if (!hasContent) { toast.error('Escribe algo o sube una imagen'); return; }
    if (form.tipo !== 'publicacion' && !form.titulo.trim()) {
      toast.error('El título es obligatorio para este tipo de publicación');
      return;
    }

    setSaving(true);
    try {
      let imagenUrl: string | null = null;
      if (imageFile) {
        imagenUrl = await uploadImage();
        if (imagenUrl === null && imageFile) { setSaving(false); return; }
      } else if (editing && imagePreview) {
        imagenUrl = imagePreview;
      }

      const payload = {
        autor_id: user?.id ?? null,
        tipo: form.tipo,
        titulo: form.titulo.trim() || null,
        contenido: form.contenido.trim() || (imagenUrl ? '📷' : ''),
        imagen_url: imagenUrl,
        estado: isAdmin ? 'aprobado' : 'pendiente',
        fijada: false,
      };

      if (editing) {
        const { error } = await db.from('publicaciones').update(payload).eq('id', editing.id);
        if (error) { toast.error(`Error al actualizar: ${error.message}`); return; }
        toast.success('Publicación actualizada');
      } else {
        const { error } = await db.from('publicaciones').insert(payload);
        if (error) { toast.error(`Error al publicar: ${error.message}`); return; }
        toast.success(isAdmin ? 'Publicación creada' : 'Publicación enviada — pendiente de revisión');
      }

      closeModal();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await db.from('publicaciones').delete().eq('id', deleteTarget.id);
    if (error) {
      toast.error(`Error al eliminar: ${error.message}`);
    } else {
      toast.success('Publicación eliminada');
      setPublications((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    }
    setDeleteTarget(null);
  };

  const needsFecha = form.tipo === 'evento' || form.tipo === 'convocatoria';

  return (
    <div className="max-w-[1200px] grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Feed principal */}
      <div className="lg:col-span-2 space-y-5">
        {/* Tabs */}
        <div className="card p-1 flex gap-1">
          {tabs.map((tab) => (
            <button type="button" key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={classNames('flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all',
                activeTab === tab.id ? 'bg-emerald-600 text-white shadow-emerald' : 'text-surface-600 hover:bg-surface-100')}>
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Botón nueva publicación */}
        <button type="button" onClick={openCreate}
          className="w-full card p-4 flex items-center gap-3 text-left hover:shadow-card-hover transition-all group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
            {initials(user?.nombre ?? 'U', user?.apellido)}
          </div>
          <span className="flex-1 text-surface-400 text-sm group-hover:text-surface-600">¿Qué quieres compartir con la red?</span>
          <Plus className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform" />
        </button>

        {/* Publicaciones */}
        {loading ? (
          <div className="card p-8 text-center text-surface-400">Cargando publicaciones...</div>
        ) : filteredPubs.length === 0 ? (
          <div className="card p-8 text-center text-surface-400">No hay publicaciones en esta categoría.</div>
        ) : (
          <div className="space-y-4">
            {filteredPubs.map((pub) => (
              <div key={pub.id} className="card p-5 hover:shadow-card-hover transition-all">
                <div className="flex items-start gap-3 mb-4">
                  {pub.autorAvatar
                    ? <img src={pub.autorAvatar} alt={pub.autorNombre} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                    : <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm shrink-0">{initials(pub.autorNombre)}</div>}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-surface-900 text-sm">{pub.autorNombre}</span>
                      <Badge variant={pub.autorRol === 'productor' ? 'emerald' : pub.autorRol === 'comprador' ? 'blue' : 'purple'}>{pub.autorRol}</Badge>
                      <span className={classNames('px-2 py-0.5 rounded-full text-xs font-medium', tipoColors[pub.tipo])}>{tipoLabels[pub.tipo] ?? pub.tipo}</span>
                    </div>
                    <p className="text-xs text-surface-400 mt-0.5">{timeAgo(pub.createdAt)}</p>
                  </div>
                  {canEdit(pub) && (
                    <div className="flex gap-1.5 shrink-0">
                      <button type="button" aria-label="Editar" onClick={() => openEdit(pub)}
                        className="w-7 h-7 rounded-lg bg-surface-100 hover:bg-emerald-50 hover:text-emerald-700 flex items-center justify-center text-surface-500 transition-colors">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" aria-label="Eliminar" onClick={() => setDeleteTarget(pub)}
                        className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {pub.titulo && <h3 className="font-display font-bold text-surface-900 mb-2">{pub.titulo}</h3>}
                {pub.contenido !== '📷' && <p className="text-surface-700 text-sm leading-relaxed mb-3">{pub.contenido}</p>}
                {pub.imagenes?.[0] && (
                  <img src={pub.imagenes[0]} alt="" className="w-full max-h-80 object-cover rounded-2xl mb-3" />
                )}

                <div className="flex items-center gap-1 pt-3 border-t border-surface-50">
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm text-surface-400 select-none"><Heart className="w-4 h-4" />0</span>
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm text-surface-400 select-none"><MessageSquare className="w-4 h-4" />0</span>
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm text-surface-400 select-none"><Share2 className="w-4 h-4" />0</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-5">
        <div className="card p-5">
          <h3 className="font-display font-semibold text-surface-900 mb-4">Actores para conectar</h3>
          <div className="space-y-3">
            {actores.slice(0, 5).map((actor) => (
              <div key={actor.id} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-surface-100 flex items-center justify-center font-bold text-emerald-700 text-xs shrink-0">
                  {actor.nombre.slice(0, 2).toUpperCase()}
                </div>
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
            <Metric icon={Briefcase} label="Oportunidades" value={visiblePubs.filter((p) => p.tipo === 'oportunidad').length} />
            <Metric icon={Bell} label="Convocatorias" value={visiblePubs.filter((p) => ['convocatoria', 'evento'].includes(p.tipo)).length} />
          </div>
        </div>
      </div>

      {/* Modal nueva / editar — portal para evitar stacking context del layout */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={closeModal}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-glass-xl w-full sm:max-w-lg max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-surface-100 shrink-0">
              <div>
                <h3 className="font-display text-lg font-bold text-surface-900">
                  {editing ? 'Editar publicación' : 'Nueva publicación'}
                </h3>
                <p className="text-xs text-surface-400 mt-0.5">
                  {editing ? 'Modifica y guarda.' : 'Comparte con la red de ARTICULA CAJ.'}
                </p>
              </div>
              <button type="button" aria-label="Cerrar" onClick={closeModal}
                className="w-8 h-8 rounded-xl hover:bg-surface-100 flex items-center justify-center text-surface-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              {/* Tipo */}
              <div>
                <label htmlFor="pub-tipo" className="label">Tipo de publicación</label>
                <select id="pub-tipo" className="input-field" value={form.tipo}
                  onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as PostTipo, titulo: '' }))}>
                  {(Object.entries(tipoLabels) as [PostTipo, string][]).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Título (requerido salvo para publicación simple) */}
              {form.tipo !== 'publicacion' && (
                <div>
                  <label htmlFor="pub-titulo" className="label">Título *</label>
                  <input id="pub-titulo" className="input-field"
                    placeholder={
                      form.tipo === 'oportunidad' ? 'Ej: Buscamos proveedores de café' :
                      form.tipo === 'convocatoria' ? 'Ej: Fondos AGROIDEAS 2026' :
                      'Ej: Rueda de negocios Cajamarca'}
                    value={form.titulo}
                    onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} />
                </div>
              )}

              {/* Fecha para eventos/convocatorias */}
              {needsFecha && (
                <div>
                  <label htmlFor="pub-fecha" className="label">Fecha</label>
                  <input id="pub-fecha" type="date" className="input-field" value={form.fecha}
                    onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))} />
                </div>
              )}

              {/* Contenido */}
              <div>
                <label htmlFor="pub-contenido" className="label">
                  {form.tipo === 'publicacion' ? 'Descripción (opcional si subes imagen)' : 'Descripción *'}
                </label>
                <textarea id="pub-contenido" rows={4} className="input-field resize-none"
                  placeholder={form.tipo === 'publicacion' ? '¿Qué quieres compartir?' : 'Describe la oportunidad, convocatoria o evento...'}
                  value={form.contenido}
                  onChange={(e) => setForm((f) => ({ ...f, contenido: e.target.value }))} />
              </div>

              {/* Imagen */}
              <div>
                <label className="label">Imagen (opcional)</label>
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  aria-label="Subir imagen" onChange={handleImageChange} />
                {imagePreview ? (
                  <div className="relative rounded-xl overflow-hidden">
                    <img src={imagePreview} alt="Vista previa" className="w-full h-44 object-cover" />
                    <button type="button" aria-label="Quitar imagen"
                      onClick={() => { setImageFile(null); setImagePreview(''); }}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="w-full border-2 border-dashed border-surface-200 rounded-xl py-6 flex flex-col items-center gap-2 text-surface-400 hover:border-emerald-300 hover:text-emerald-600 transition-colors">
                    <ImagePlus className="w-6 h-6" />
                    <span className="text-sm">Haz clic para subir imagen</span>
                  </button>
                )}
              </div>

              {!isAdmin && (
                <div className="flex gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">Tu publicación quedará pendiente hasta que el administrador la apruebe.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-surface-100 p-5 flex gap-3 justify-end shrink-0">
              <button type="button" className="btn-secondary" onClick={closeModal}>Cancelar</button>
              <button type="button" className="btn-primary" onClick={savePost} disabled={saving}>
                {saving ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Guardando...</>
                ) : editing ? (
                  <><Save className="w-4 h-4" /> Guardar cambios</>
                ) : (
                  <><Send className="w-4 h-4" /> Publicar</>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Confirm delete — portal */}
      {deleteTarget && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl shadow-glass-xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}>
            <div className="w-11 h-11 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>
            <h3 className="font-display font-bold text-surface-900">¿Eliminar publicación?</h3>
            <p className="text-sm text-surface-500 mt-1 mb-5 line-clamp-2">
              {deleteTarget.titulo
                ? <>"<span className="font-medium text-surface-700">{deleteTarget.titulo}</span>" será eliminado permanentemente.</>
                : 'Esta publicación será eliminada permanentemente.'}
            </p>
            <div className="flex gap-3">
              <button type="button" className="flex-1 btn-secondary justify-center" onClick={() => setDeleteTarget(null)}>
                Cancelar
              </button>
              <button type="button"
                className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-red-500 hover:bg-red-600 text-white transition-colors"
                onClick={confirmDelete}>
                Eliminar
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-surface-600 flex-1">{label}</span>
      <span className="font-bold text-surface-900">{value}</span>
    </div>
  );
}
