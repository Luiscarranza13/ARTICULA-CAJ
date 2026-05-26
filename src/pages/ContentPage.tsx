import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, Edit, Newspaper, Plus, Save, Search, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Badge from '../components/common/Badge';
import { supabase } from '../lib/supabase';
import { classNames, timeAgo } from '../lib/utils';

type Tab = 'noticias' | 'eventos' | 'convocatorias';
type Item = { id: string; titulo: string; descripcion: string; estado?: string; fecha?: string; created_at?: string };
type ContentRow = Record<string, string | boolean | null | undefined> & { id: string };

const emptyForm = { titulo: '', descripcion: '', fecha: '', lugar: '', entidad: '' };

export default function ContentPage() {
  const [tab, setTab] = useState<Tab>('noticias');
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    const table = tab;
    const select = tab === 'noticias'
      ? 'id,titulo,resumen,publicado,created_at'
      : tab === 'eventos'
        ? 'id,titulo,descripcion,fecha,lugar,estado,created_at'
        : 'id,titulo,descripcion,entidad,estado,created_at';
    const { data, error } = await supabase.from(table).select(select as '*').order('created_at', { ascending: false });
    if (error) {
      toast.error(error.message);
      return;
    }
    setItems(((data ?? []) as ContentRow[]).map((row) => ({
      id: row.id,
      titulo: String(row.titulo ?? ''),
      descripcion: String(row.resumen ?? row.descripcion ?? row.lugar ?? row.entidad ?? ''),
      estado: String(row.estado ?? (row.publicado ? 'publicado' : 'borrador')),
      fecha: row.fecha ? String(row.fecha) : undefined,
      created_at: row.created_at ? String(row.created_at) : undefined,
    })));
  }, [tab]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter((item) => !q || [item.titulo, item.descripcion, item.estado].some((value) => value?.toLowerCase().includes(q)));
  }, [items, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (item: Item) => {
    setEditing(item);
    setForm({ ...emptyForm, titulo: item.titulo, descripcion: item.descripcion, fecha: item.fecha ?? '' });
    setShowForm(true);
  };

  const save = async () => {
    const payload = tab === 'noticias'
      ? { titulo: form.titulo, resumen: form.descripcion, contenido: form.descripcion, publicado: true }
      : tab === 'eventos'
        ? { titulo: form.titulo, descripcion: form.descripcion, fecha: form.fecha || new Date().toISOString().slice(0, 10), lugar: form.lugar || 'Por definir', tipo: 'feria', estado: 'aprobado' }
        : { titulo: form.titulo, descripcion: form.descripcion, entidad: form.entidad || 'ARTICULA CAJ', estado: 'aprobado' };
    const result = editing
      ? await supabase.from(tab).update(payload as never).eq('id', editing.id)
      : await supabase.from(tab).insert(payload as never);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    toast.success(editing ? 'Contenido actualizado' : 'Contenido creado');
    setShowForm(false);
    await load();
  };

  const remove = async (item: Item) => {
    const { error } = await supabase.from(tab).delete().eq('id', item.id);
    if (error) toast.error(error.message);
    else {
      toast.success('Contenido eliminado');
      await load();
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
        <div className="flex gap-2 overflow-x-auto">
          {(['noticias', 'eventos', 'convocatorias'] as Tab[]).map((item) => (
            <button key={item} onClick={() => setTab(item)} className={classNames('px-4 py-2 rounded-xl text-sm font-semibold capitalize', tab === item ? 'bg-emerald-600 text-white' : 'bg-white border border-surface-200 text-surface-600')}>{item}</button>
          ))}
        </div>
        <button className="btn-primary" onClick={openCreate}><Plus className="w-4 h-4" />Nuevo contenido</button>
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input className="input-field pl-9 py-2" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar contenidos..." />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((item) => (
          <div key={item.id} className="card p-5 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">{tab === 'noticias' ? <Newspaper className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}</div>
              <Badge variant={item.estado === 'aprobado' || item.estado === 'publicado' ? 'emerald' : 'gray'}>{item.estado ?? 'activo'}</Badge>
            </div>
            <div className="flex-1">
              <h3 className="font-display font-bold text-surface-900 line-clamp-2">{item.titulo}</h3>
              <p className="text-sm text-surface-500 mt-2 line-clamp-3">{item.descripcion}</p>
            </div>
            <div className="flex items-center justify-between text-xs text-surface-400">
              <span>{item.created_at ? timeAgo(item.created_at) : '-'}</span>
              <div className="flex gap-2">
                <button aria-label="Editar" onClick={() => openEdit(item)} className="text-surface-500 hover:text-emerald-700"><Edit className="w-4 h-4" /></button>
                <button aria-label="Eliminar" onClick={() => remove(item)} className="text-surface-500 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-glass-xl w-full max-w-lg p-6 space-y-4" onClick={(event) => event.stopPropagation()}>
            <h3 className="font-display text-lg font-bold text-surface-900">{editing ? 'Editar' : 'Nuevo'} {tab}</h3>
            <input className="input-field" placeholder="Titulo" value={form.titulo} onChange={(event) => setForm((current) => ({ ...current, titulo: event.target.value }))} />
            <textarea className="input-field resize-none" rows={4} placeholder="Descripcion" value={form.descripcion} onChange={(event) => setForm((current) => ({ ...current, descripcion: event.target.value }))} />
            {tab === 'eventos' && <input type="date" className="input-field" value={form.fecha} onChange={(event) => setForm((current) => ({ ...current, fecha: event.target.value }))} />}
            {tab === 'convocatorias' && <input className="input-field" placeholder="Entidad" value={form.entidad} onChange={(event) => setForm((current) => ({ ...current, entidad: event.target.value }))} />}
            <div className="flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
              <button className="btn-primary" onClick={save}><Save className="w-4 h-4" />Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
