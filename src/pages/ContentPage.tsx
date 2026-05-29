import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Calendar, Edit, Newspaper, Plus, RefreshCw, Save, Search, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Badge from '../components/common/Badge';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { classNames, timeAgo } from '../lib/utils';
import { useStore } from '../store/useStore';

const db = supabaseAdmin ?? supabase;

type Tab = 'noticias' | 'eventos' | 'convocatorias';

type Item = {
  id: string;
  titulo: string;
  descripcion: string;
  estado: string;
  fecha?: string;
  lugar?: string;
  created_at?: string;
};

const TAB_LABELS: Record<Tab, string> = {
  noticias: 'Noticias',
  eventos: 'Eventos',
  convocatorias: 'Convocatorias',
};

const TAB_ICONS: Record<Tab, typeof Newspaper> = {
  noticias: Newspaper,
  eventos: Calendar,
  convocatorias: Bell,
};

const EMPTY_FORM = { titulo: '', descripcion: '', fecha: '', lugar: '', estado: 'aprobado' };

export default function ContentPage() {
  const { user } = useStore();
  const [tab, setTab] = useState<Tab>('noticias');
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ open: boolean; item: Item | null }>({ open: false, item: null });
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let rows: Item[] = [];
      if (tab === 'noticias' || tab === 'convocatorias') {
        const tipo = tab === 'noticias' ? 'publicacion' : 'convocatoria';
        const { data, error } = await db
          .from('publicaciones')
          .select('id,titulo,contenido,estado,created_at')
          .eq('tipo', tipo)
          .order('created_at', { ascending: false });
        if (error) throw error;
        rows = ((data ?? []) as { id: string; titulo: string | null; contenido: string | null; estado: string | null; created_at: string | null }[]).map((r) => ({
          id: r.id,
          titulo: r.titulo ?? '(Sin título)',
          descripcion: r.contenido ?? '',
          estado: r.estado ?? 'pendiente',
          created_at: r.created_at ?? undefined,
        }));
      } else {
        const { data, error } = await db
          .from('eventos')
          .select('id,titulo,descripcion,fecha,lugar,created_at')
          .order('created_at', { ascending: false });
        if (error) throw error;
        rows = ((data ?? []) as { id: string; titulo: string | null; descripcion: string | null; fecha: string | null; lugar: string | null; created_at: string | null }[]).map((r) => ({
          id: r.id,
          titulo: r.titulo ?? '(Sin título)',
          descripcion: r.descripcion ?? '',
          estado: 'publicado',
          fecha: r.fecha ?? undefined,
          lugar: r.lugar ?? undefined,
          created_at: r.created_at ?? undefined,
        }));
      }
      if (mountedRef.current) setItems(rows);
    } catch (error) {
      if (mountedRef.current) toast.error(error instanceof Error ? error.message : 'No se pudo cargar el contenido');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    mountedRef.current = true;
    queueMicrotask(() => { if (mountedRef.current) void load(); });
    return () => { mountedRef.current = false; };
  }, [load]);

  // Realtime — suscripción a cambios en publicaciones y eventos
  useEffect(() => {
    const pubChannel = supabase
      .channel('content-publicaciones')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'publicaciones' }, () => {
        if (mountedRef.current && tab !== 'eventos') void load();
      })
      .subscribe();

    const evtChannel = supabase
      .channel('content-eventos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'eventos' }, () => {
        if (mountedRef.current && tab === 'eventos') void load();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(pubChannel);
      void supabase.removeChannel(evtChannel);
    };
  }, [tab, load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => !q || [item.titulo, item.descripcion, item.estado, item.lugar]
      .some((v) => v?.toLowerCase().includes(q)));
  }, [items, search]);

  const openCreate = () => {
    setModal({ open: true, item: null });
    setForm({ ...EMPTY_FORM, estado: user?.rol === 'administrador' ? 'aprobado' : 'pendiente' });
  };

  const openEdit = (item: Item) => {
    setModal({ open: true, item });
    setForm({
      titulo: item.titulo,
      descripcion: item.descripcion,
      fecha: item.fecha ?? '',
      lugar: item.lugar ?? '',
      estado: item.estado,
    });
  };

  const closeModal = () => {
    setModal({ open: false, item: null });
    setForm(EMPTY_FORM);
  };

  const save = async () => {
    if (!form.titulo.trim()) { toast.error('El título es obligatorio'); return; }
    if (tab === 'eventos' && !form.fecha) { toast.error('La fecha es obligatoria para eventos'); return; }

    setSaving(true);
    try {
      if (tab === 'noticias' || tab === 'convocatorias') {
        const payload = {
          tipo: tab === 'noticias' ? 'publicacion' : 'convocatoria',
          titulo: form.titulo.trim(),
          contenido: form.descripcion.trim(),
          estado: form.estado,
          autor_id: user?.id ?? null,
          fijada: false,
        };
        if (modal.item) {
          const { error } = await db.from('publicaciones').update(payload).eq('id', modal.item.id);
          if (error) throw error;
          toast.success('Contenido actualizado');
        } else {
          const { error } = await db.from('publicaciones').insert(payload);
          if (error) throw error;
          toast.success('Contenido creado');
        }
      } else {
        const payload = {
          titulo: form.titulo.trim(),
          descripcion: form.descripcion.trim(),
          fecha: form.fecha,
          lugar: form.lugar.trim() || 'Por definir',
          tipo: 'feria',
          organizador_texto: 'ARTICULA CAJ',
        };
        if (modal.item) {
          const { error } = await db.from('eventos').update(payload).eq('id', modal.item.id);
          if (error) throw error;
          toast.success('Evento actualizado');
        } else {
          const { error } = await db.from('eventos').insert(payload);
          if (error) throw error;
          toast.success('Evento creado');
        }
      }
      closeModal();
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      const table = tab === 'eventos' ? 'eventos' : 'publicaciones';
      const { error } = await db.from(table).delete().eq('id', deleteTarget.id);
      if (error) throw error;
      toast.success('Eliminado correctamente');
      setDeleteTarget(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar');
    }
  };

  const Icon = TAB_ICONS[tab];

  return (
    <div className="space-y-5 max-w-[1400px]">
      {/* Header con tabs y acciones */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
            <button type="button" key={t} onClick={() => setTab(t)}
              className={classNames('flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all',
                tab === t ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white border border-surface-200 text-surface-600 hover:border-emerald-300')}>
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
        <button type="button" className="btn-primary shrink-0" onClick={openCreate}>
          <Plus className="w-4 h-4" /> Nuevo {TAB_LABELS[tab].toLowerCase().slice(0, -1)}
        </button>
      </div>

      {/* Buscador y recarga */}
      <div className="card p-3 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input className="input-field pl-9 py-2" value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Buscar ${TAB_LABELS[tab].toLowerCase()}...`} />
        </div>
        <button type="button" onClick={load} className="btn-secondary px-3" title="Recargar">
          <RefreshCw className={classNames('w-4 h-4', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Grid de contenido */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="md:col-span-2 xl:col-span-3 card p-10 text-center text-surface-400">
            Cargando {TAB_LABELS[tab].toLowerCase()}...
          </div>
        ) : filtered.length === 0 ? (
          <div className="md:col-span-2 xl:col-span-3 card p-10 text-center text-surface-400">
            No hay {TAB_LABELS[tab].toLowerCase()} aún. Crea el primero con el botón de arriba.
          </div>
        ) : filtered.map((item) => (
          <div key={item.id} className="card p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4" />
              </div>
              <Badge variant={item.estado === 'aprobado' || item.estado === 'publicado' ? 'emerald' : item.estado === 'pendiente' ? 'blue' : 'gray'}>
                {item.estado}
              </Badge>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-bold text-surface-900 text-sm line-clamp-2 leading-snug">{item.titulo}</h3>
              <p className="text-xs text-surface-500 mt-1.5 line-clamp-3 leading-relaxed">{item.descripcion}</p>
              {item.fecha && (
                <p className="text-xs text-emerald-600 mt-1.5 font-medium">{item.fecha}{item.lugar ? ` · ${item.lugar}` : ''}</p>
              )}
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-surface-50">
              <span className="text-xs text-surface-400">{item.created_at ? timeAgo(item.created_at) : '—'}</span>
              <div className="flex gap-1.5">
                <button type="button" aria-label="Editar" onClick={() => openEdit(item)}
                  className="w-7 h-7 rounded-lg bg-surface-100 hover:bg-emerald-50 hover:text-emerald-700 flex items-center justify-center text-surface-500 transition-colors">
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button type="button" aria-label="Eliminar" onClick={() => setDeleteTarget(item)}
                  className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal crear / editar */}
      {modal.open && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={closeModal}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-glass-xl w-full sm:max-w-lg max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-surface-100 shrink-0">
              <div>
                <h3 className="font-display text-lg font-bold text-surface-900">
                  {modal.item ? 'Editar' : 'Nuevo'} {TAB_LABELS[tab].toLowerCase().slice(0, -1)}
                </h3>
                <p className="text-xs text-surface-400 mt-0.5">
                  {modal.item ? 'Modifica los campos y guarda los cambios.' : `Completa los datos para crear ${TAB_LABELS[tab].toLowerCase().slice(0, -1)}.`}
                </p>
              </div>
              <button type="button" aria-label="Cerrar" onClick={closeModal}
                className="w-8 h-8 rounded-xl hover:bg-surface-100 flex items-center justify-center text-surface-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              <div>
                <label className="label">Título *</label>
                <input className="input-field" placeholder="Escribe el título..." value={form.titulo}
                  onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} />
              </div>

              <div>
                <label className="label">{tab === 'eventos' ? 'Descripción' : 'Contenido'}</label>
                <textarea className="input-field resize-none" rows={5}
                  placeholder={tab === 'eventos' ? 'Descripción del evento...' : 'Escribe el contenido aquí...'}
                  value={form.descripcion}
                  onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))} />
              </div>

              {tab === 'eventos' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="cp-fecha" className="label">Fecha *</label>
                    <input id="cp-fecha" type="date" className="input-field" value={form.fecha}
                      onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Lugar</label>
                    <input className="input-field" placeholder="Lugar del evento" value={form.lugar}
                      onChange={(e) => setForm((f) => ({ ...f, lugar: e.target.value }))} />
                  </div>
                </div>
              )}

              {tab !== 'eventos' && (
                <div>
                  <label htmlFor="cp-estado" className="label">Estado</label>
                  <select id="cp-estado" className="input-field" value={form.estado}
                    onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))}>
                    <option value="aprobado">Aprobado (visible)</option>
                    <option value="pendiente">Pendiente (en revisión)</option>
                    <option value="borrador">Borrador (oculto)</option>
                  </select>
                </div>
              )}
            </div>

            <div className="border-t border-surface-100 p-5 flex gap-3 justify-end shrink-0">
              <button type="button" className="btn-secondary" onClick={closeModal}>Cancelar</button>
              <button type="button" className="btn-primary" onClick={save} disabled={saving}>
                {saving ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Guardando...</>
                ) : (
                  <><Save className="w-4 h-4" /> {modal.item ? 'Guardar cambios' : 'Crear'}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmación eliminar */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl shadow-glass-xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}>
            <div className="w-11 h-11 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>
            <h3 className="font-display font-bold text-surface-900">¿Eliminar este contenido?</h3>
            <p className="text-sm text-surface-500 mt-1 mb-5 line-clamp-2">
              "<span className="font-medium text-surface-700">{deleteTarget.titulo}</span>" será eliminado permanentemente.
            </p>
            <div className="flex gap-3">
              <button type="button" className="flex-1 btn-secondary justify-center" onClick={() => setDeleteTarget(null)}>
                Cancelar
              </button>
              <button type="button" className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-red-500 hover:bg-red-600 text-white transition-colors"
                onClick={remove}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
