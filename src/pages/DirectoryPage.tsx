import { createPortal } from 'react-dom';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Edit, Grid, List, Mail, MapPin, Phone, Plus, Save, Search, Trash2, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchActores } from '../lib/data';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { classNames, getTipoActorColor } from '../lib/utils';
import { useStore } from '../store/useStore';
import type { Actor } from '../types';

const db = supabaseAdmin ?? supabase;

type ActorForm = {
  nombre: string;
  tipo: Actor['tipo'];
  rubro: string;
  distrito: string;
  descripcion: string;
  telefono: string;
  correo: string;
  capacidadProductiva: string;
};

const emptyForm: ActorForm = {
  nombre: '',
  tipo: 'empresa',
  rubro: '',
  distrito: 'Cajamarca',
  descripcion: '',
  telefono: '',
  correo: '',
  capacidadProductiva: '',
};

const tipos = ['Todos', 'productor', 'asociacion', 'cooperativa', 'empresa', 'institucion'];

export default function DirectoryPage() {
  const { user } = useStore();
  const [actores, setActores] = useState<Actor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTipo, setSelectedTipo] = useState('Todos');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selected, setSelected] = useState<Actor | null>(null);
  const [editing, setEditing] = useState<Actor | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ActorForm>(emptyForm);

  const load = async () => {
    setLoading(true);
    try {
      setActores(await fetchActores());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cargar el directorio');
    }
    setLoading(false);
  };

  useEffect(() => {
    queueMicrotask(() => void load());
    const channel = supabase
      .channel('directory-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'actores' }, () => void load())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const filtered = useMemo(() => actores.filter((actor) => {
    const q = search.toLowerCase();
    const matchSearch = !q || [actor.nombre, actor.rubro, actor.descripcion, actor.distrito].some((value) => value.toLowerCase().includes(q));
    const matchTipo = selectedTipo === 'Todos' || actor.tipo === selectedTipo;
    return matchSearch && matchTipo;
  }), [actores, search, selectedTipo]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (actor: Actor) => {
    setEditing(actor);
    setShowForm(true);
    setForm({
      nombre: actor.nombre,
      tipo: actor.tipo,
      rubro: actor.rubro,
      distrito: actor.distrito,
      descripcion: actor.descripcion,
      telefono: actor.contacto.telefono,
      correo: actor.contacto.correo,
      capacidadProductiva: actor.capacidadProductiva ?? '',
    });
  };

  const saveActor = async () => {
    if (!form.nombre.trim()) return;
    const payload = {
      nombre: form.nombre,
      tipo: form.tipo,
      rubro_texto: form.rubro,
      ubicacion_texto: form.distrito,
      provincia_texto: 'Cajamarca',
      descripcion: form.descripcion,
      contacto: form.telefono,
      correo: form.correo,
      capacidad_productiva: form.capacidadProductiva,
      estado: user?.rol === 'administrador' ? 'aprobado' : 'pendiente',
      verificado: user?.rol === 'administrador',
      propietario_id: user?.id ?? null,
    };

    const result = editing
      ? await db.from('actores').update(payload).eq('id', editing.id)
      : await db.from('actores').insert(payload);

    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    toast.success(editing ? 'Actor actualizado' : 'Actor creado');
    setEditing(null);
    setForm(emptyForm);
    setShowForm(false);
    await load();
  };

  const deleteActor = async (actor: Actor) => {
    const { error } = await db.from('actores').delete().eq('id', actor.id);
    if (error) toast.error(error.message);
    else {
      toast.success('Actor eliminado');
      setSelected(null);
      await load();
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-surface-900">{filtered.length} actores encontrados</h2>
          <p className="text-surface-400 text-sm">Directorio de productores, asociaciones e instituciones</p>
        </div>
        <div className="flex items-center gap-2">
          {user?.rol === 'administrador' && (
            <button type="button" onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" />Nuevo actor</button>
          )}
          <button type="button" aria-label="Vista grilla" onClick={() => setViewMode('grid')} className={classNames('w-9 h-9 rounded-xl flex items-center justify-center', viewMode === 'grid' ? 'bg-emerald-100 text-emerald-700' : 'bg-white border border-surface-200 text-surface-500')}><Grid className="w-4 h-4" /></button>
          <button type="button" aria-label="Vista lista" onClick={() => setViewMode('list')} className={classNames('w-9 h-9 rounded-xl flex items-center justify-center', viewMode === 'list' ? 'bg-emerald-100 text-emerald-700' : 'bg-white border border-surface-200 text-surface-500')}><List className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar actores, rubros..." className="input-field pl-10 py-2.5" />
        </div>
        <div className="flex flex-wrap gap-2">
          {tipos.map((tipo) => (
            <button type="button" key={tipo} onClick={() => setSelectedTipo(tipo)} className={classNames('px-3 py-1.5 rounded-lg text-xs font-medium', selectedTipo === tipo ? 'bg-emerald-600 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200')}>
              {tipo}
            </button>
          ))}
        </div>
      </div>

      {loading ? <div className="card p-8 text-center text-surface-400">Cargando directorio...</div> : (
        <div className={classNames('gap-5', viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'flex flex-col')}>
          {filtered.map((actor, index) => (
            <motion.div key={actor.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }} onClick={() => setSelected(actor)} className={classNames('card cursor-pointer hover:shadow-card-hover transition-all', viewMode === 'list' ? 'p-5 flex items-center gap-4' : 'p-6')}>
              <div className="w-14 h-14 rounded-2xl bg-surface-100 overflow-hidden flex-shrink-0">
                {actor.logo ? <img src={actor.logo} alt={actor.nombre} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-emerald-700">{actor.nombre.slice(0, 2).toUpperCase()}</div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={classNames('text-xs font-medium px-2 py-0.5 rounded-full capitalize', getTipoActorColor(actor.tipo))}>{actor.tipo}</span>
                  {actor.verificado && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                </div>
                <h3 className="font-display font-bold text-surface-900 text-sm leading-snug line-clamp-2">{actor.nombre}</h3>
                <p className="text-xs text-surface-500 mt-2 line-clamp-2">{actor.descripcion}</p>
                <div className="flex items-center gap-3 mt-3 text-xs text-surface-400">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{actor.distrito}</span>
                  <span>{actor.rubro}</span>
                  {actor.miembros && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{actor.miembros}</span>}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {(selected || showForm) && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => { setSelected(null); setEditing(null); setForm(emptyForm); setShowForm(false); }}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-glass-xl w-full sm:max-w-lg p-6 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {selected && !showForm ? (
              <>
                <div className="flex justify-between gap-4 mb-4">
                  <div>
                    <h3 className="font-display text-xl font-bold text-surface-900">{selected.nombre}</h3>
                    <p className="text-sm text-surface-400">{selected.rubro} · {selected.distrito}</p>
                  </div>
                  <button type="button" aria-label="Cerrar" onClick={() => setSelected(null)}><X className="w-5 h-5" /></button>
                </div>
                <p className="text-sm text-surface-600 mb-4">{selected.descripcion}</p>
                <div className="space-y-2 text-sm mb-5">
                  <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-emerald-600" />{selected.contacto.telefono || 'Sin teléfono'}</p>
                  <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-emerald-600" />{selected.contacto.correo || 'Sin correo'}</p>
                </div>
                {user?.rol === 'administrador' && (
                  <div className="flex gap-3">
                    <button type="button" className="btn-secondary flex-1 justify-center" onClick={() => openEdit(selected)}><Edit className="w-4 h-4" />Editar</button>
                    <button type="button" className="inline-flex flex-1 justify-center items-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-xl" onClick={() => deleteActor(selected)}><Trash2 className="w-4 h-4" />Eliminar</button>
                  </div>
                )}
              </>
            ) : (
              <ActorFormView form={form} setForm={setForm} editing={editing} onCancel={() => { setForm(emptyForm); setEditing(null); setShowForm(false); }} onSave={saveActor} />
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

function ActorFormView({ form, setForm, editing, onCancel, onSave }: {
  form: ActorForm;
  setForm: React.Dispatch<React.SetStateAction<ActorForm>>;
  editing: Actor | null;
  onCancel: () => void;
  onSave: () => void;
}) {
  const set = (field: keyof ActorForm, value: string) => setForm((current) => ({ ...current, [field]: value }));
  return (
    <div className="space-y-4">
      <h3 className="font-display text-lg font-bold text-surface-900">{editing ? 'Editar actor' : 'Nuevo actor'}</h3>
      <input className="input-field" placeholder="Nombre" value={form.nombre} onChange={(e) => set('nombre', e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <select aria-label="Tipo de actor" className="input-field" value={form.tipo} onChange={(e) => set('tipo', e.target.value)}>
          {tipos.filter((tipo) => tipo !== 'Todos').map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
        </select>
        <input className="input-field" placeholder="Rubro" value={form.rubro} onChange={(e) => set('rubro', e.target.value)} />
      </div>
      <input className="input-field" placeholder="Distrito" value={form.distrito} onChange={(e) => set('distrito', e.target.value)} />
      <textarea className="input-field resize-none" rows={3} placeholder="Descripción" value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <input className="input-field" placeholder="Telefono" value={form.telefono} onChange={(e) => set('telefono', e.target.value)} />
        <input className="input-field" placeholder="Correo" value={form.correo} onChange={(e) => set('correo', e.target.value)} />
      </div>
      <input className="input-field" placeholder="Capacidad productiva" value={form.capacidadProductiva} onChange={(e) => set('capacidadProductiva', e.target.value)} />
      <div className="flex gap-3 justify-end">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancelar</button>
        <button type="button" className="btn-primary" onClick={onSave}><Save className="w-4 h-4" />Guardar</button>
      </div>
    </div>
  );
}
