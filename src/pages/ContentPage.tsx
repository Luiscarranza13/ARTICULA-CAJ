import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, Edit, Newspaper, Save, Search, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Badge from '../components/common/Badge';
import { supabase } from '../lib/supabase';
import { classNames, timeAgo } from '../lib/utils';
import { useStore } from '../store/useStore';

type Tab = 'noticias' | 'eventos' | 'convocatorias';
type Item = { id: string; titulo: string; descripcion: string; estado?: string; fecha?: string; created_at?: string };

// Noticias y convocatorias se guardan en la tabla "publicaciones" con su tipo correspondiente.
// Eventos tienen su propia tabla.
const emptyForm = { titulo: '', descripcion: '', fecha: '', lugar: '', entidad: '' };

export default function ContentPage() {
  const { user } = useStore();
  const [tab, setTab] = useState<Tab>('noticias');
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    if (tab === 'noticias') {
      const { data, error } = await supabase
        .from('publicaciones')
        .select('id,titulo,contenido,estado,created_at')
        .eq('tipo', 'publicacion')
        .order('created_at', { ascending: false });
      if (error) { toast.error(error.message); return; }
      setItems(((data ?? []) as { id: string; titulo: string | null; contenido: string | null; estado: string | null; created_at: string | null }[]).map((row) => ({
        id: row.id,
        titulo: row.titulo ?? '(Sin título)',
        descripcion: row.contenido ?? '',
        estado: row.estado ?? 'borrador',
        created_at: row.created_at ?? undefined,
      })));
    } else if (tab === 'convocatorias') {
      const { data, error } = await supabase
        .from('publicaciones')
        .select('id,titulo,contenido,estado,created_at')
        .eq('tipo', 'convocatoria')
        .order('created_at', { ascending: false });
      if (error) { toast.error(error.message); return; }
      setItems(((data ?? []) as { id: string; titulo: string | null; contenido: string | null; estado: string | null; created_at: string | null }[]).map((row) => ({
        id: row.id,
        titulo: row.titulo ?? '(Sin título)',
        descripcion: row.contenido ?? '',
        estado: row.estado ?? 'borrador',
        created_at: row.created_at ?? undefined,
      })));
    } else {
      // Eventos
      const { data, error } = await supabase
        .from('eventos')
        .select('id,titulo,descripcion,fecha,lugar,created_at')
        .order('created_at', { ascending: false });
      if (error) { toast.error(error.message); return; }
      setItems(((data ?? []) as { id: string; titulo: string | null; descripcion: string | null; fecha: string | null; lugar: string | null; created_at: string | null }[]).map((row) => ({
        id: row.id,
        titulo: row.titulo ?? '(Sin título)',
        descripcion: [row.descripcion, row.lugar].filter(Boolean).join(' · '),
        estado: 'aprobado',
        fecha: row.fecha ?? undefined,
        created_at: row.created_at ?? undefined,
      })));
    }
  }, [tab]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter((item) => !q || [item.titulo, item.descripcion, item.estado].some((value) => value?.toLowerCase().includes(q)));
  }, [items, search]);

  const openEdit = (item: Item) => {
    setEditing(item);
    setForm({ ...emptyForm, titulo: item.titulo, descripcion: item.descripcion, fecha: item.fecha ?? '' });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.titulo.trim()) { toast.error('El título es obligatorio'); return; }

    if (tab === 'noticias') {
      const payload = {
        autor_id: user?.id ?? null,
        tipo: 'publicacion',
        titulo: form.titulo,
        contenido: form.descripcion,
        estado: user?.rol === 'administrador' ? 'aprobado' : 'pendiente',
        fijada: false,
      };
      const result = editing
        ? await supabase.from('publicaciones').update(payload).eq('id', editing.id)
        : await supabase.from('publicaciones').insert(payload);
      if (result.error) { toast.error(result.error.message); return; }

    } else if (tab === 'convocatorias') {
      const payload = {
        autor_id: user?.id ?? null,
        tipo: 'convocatoria',
        titulo: form.titulo,
        contenido: form.descripcion,
        estado: user?.rol === 'administrador' ? 'aprobado' : 'pendiente',
        fijada: false,
      };
      const result = editing
        ? await supabase.from('publicaciones').update(payload).eq('id', editing.id)
        : await supabase.from('publicaciones').insert(payload);
      if (result.error) { toast.error(result.error.message); return; }

    } else {
      // Eventos
      const payload = {
        titulo: form.titulo,
        descripcion: form.descripcion,
        fecha: form.fecha || new Date().toISOString().slice(0, 10),
        lugar: form.lugar || 'Por definir',
        tipo: 'feria',
        organizador_texto: 'ARTICULA CAJ',
      };
      const result = editing
        ? await supabase.from('eventos').update(payload).eq('id', editing.id)
        : await supabase.from('eventos').insert(payload);
      if (result.error) { toast.error(result.error.message); return; }
    }

    toast.success(editing ? 'Contenido actualizado' : 'Contenido creado');
    setShowForm(false);
    setEditing(null);
    await load();
  };

  const remove = async (item: Item) => {
    const table = tab === 'eventos' ? 'eventos' : 'publicaciones';
    const { error } = await supabase.from(table).delete().eq('id', item.id);
    if (error) toast.error(error.message);
    else {
      toast.success('Contenido eliminado');
      await load();
    }
  };

  const tabLabels: Record<Tab, string> = {
    noticias: 'Noticias',
    eventos: 'Eventos',
    convocatorias: 'Convocatorias',
  };

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex gap-2 overflow-x-auto">
        {(['noticias', 'eventos', 'convocatorias'] as Tab[]).map((t) => (
          <button type="button" key={t} onClick={() => setTab(t)}
            className={classNames('px-4 py-2 rounded-xl text-sm font-semibold', tab === t ? 'bg-emerald-600 text-white' : 'bg-white border border-surface-200 text-surface-600')}>
            {tabLabels[t]}
          </button>
        ))}
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input className="input-field pl-9 py-2" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Buscar ${tabLabels[tab].toLowerCase()}...`} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((item) => (
          <div key={item.id} className="card p-5 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                {tab === 'noticias' ? <Newspaper className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
              </div>
              <Badge variant={item.estado === 'aprobado' || item.estado === 'publicado' ? 'emerald' : 'gray'}>
                {item.estado ?? 'activo'}
              </Badge>
            </div>
            <div className="flex-1">
              <h3 className="font-display font-bold text-surface-900 line-clamp-2">{item.titulo}</h3>
              <p className="text-sm text-surface-500 mt-2 line-clamp-3">{item.descripcion}</p>
              {item.fecha && <p className="text-xs text-emerald-600 mt-1">{item.fecha}</p>}
            </div>
            <div className="flex items-center justify-between text-xs text-surface-400">
              <span>{item.created_at ? timeAgo(item.created_at) : '-'}</span>
              <div className="flex gap-2">
                <button type="button" aria-label="Editar" onClick={() => openEdit(item)} className="text-surface-500 hover:text-emerald-700"><Edit className="w-4 h-4" /></button>
                <button type="button" aria-label="Eliminar" onClick={() => remove(item)} className="text-surface-500 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="md:col-span-2 xl:col-span-3 card p-10 text-center text-surface-400">
            No hay {tabLabels[tab].toLowerCase()} publicadas aún.
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-glass-xl w-full max-w-lg p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-surface-900">
                {editing ? 'Editar' : 'Nuevo'} {tabLabels[tab].toLowerCase().slice(0, -1)}
              </h3>
              <button type="button" aria-label="Cerrar" onClick={() => setShowForm(false)} className="text-surface-400 hover:text-surface-700"><X className="w-5 h-5" /></button>
            </div>
            <div>
              <label className="label">Título *</label>
              <input className="input-field" placeholder="Título" value={form.titulo}
                onChange={(e) => setForm((c) => ({ ...c, titulo: e.target.value }))} />
            </div>
            <div>
              <label className="label">Descripción</label>
              <textarea className="input-field resize-none" rows={4} placeholder="Descripción o contenido"
                value={form.descripcion} onChange={(e) => setForm((c) => ({ ...c, descripcion: e.target.value }))} />
            </div>
            {tab === 'eventos' && (
              <>
                <div>
                  <label htmlFor="content-fecha" className="label">Fecha</label>
                  <input id="content-fecha" type="date" className="input-field" value={form.fecha}
                    onChange={(e) => setForm((c) => ({ ...c, fecha: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Lugar</label>
                  <input className="input-field" placeholder="Lugar del evento" value={form.lugar}
                    onChange={(e) => setForm((c) => ({ ...c, lugar: e.target.value }))} />
                </div>
              </>
            )}
            <div className="flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="button" className="btn-primary" onClick={save}><Save className="w-4 h-4" />Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
