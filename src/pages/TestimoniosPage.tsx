import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import {
  CheckCircle2, Eye, EyeOff, Pencil, Plus, Quote,
  Save, Search, Star, Trash2, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { classNames, timeAgo } from '../lib/utils';
import { useStore } from '../store/useStore';
import type { Testimonio } from '../types';

const db = supabaseAdmin ?? supabase;

const EMPTY: Omit<Testimonio, 'id' | 'createdAt'> = {
  nombre: '', cargo: '', organizacion: '', foto: '',
  texto: '', rating: 5, activo: true, orden: 1,
};

export default function TestimoniosPage() {
  const { testimonios, addTestimonio, updateTestimonio, deleteTestimonio, loadSiteContent } = useStore();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ open: boolean; item: Testimonio | null }>({ open: false, item: null });
  const [form, setForm] = useState<Omit<Testimonio, 'id' | 'createdAt'>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Testimonio | null>(null);

  useEffect(() => {
    void loadSiteContent();
  }, [loadSiteContent]);

  const sorted = [...testimonios]
    .sort((a, b) => a.orden - b.orden)
    .filter((t) => !search || [t.nombre, t.cargo, t.organizacion, t.texto]
      .some((v) => v?.toLowerCase().includes(search.toLowerCase())));

  const stats = {
    total: testimonios.length,
    activos: testimonios.filter((t) => t.activo).length,
    ocultos: testimonios.filter((t) => !t.activo).length,
    promedio: testimonios.length > 0
      ? (testimonios.reduce((s, t) => s + t.rating, 0) / testimonios.length).toFixed(1)
      : '0',
  };

  const openCreate = () => {
    setForm({ ...EMPTY, orden: testimonios.length + 1 });
    setModal({ open: true, item: null });
  };

  const openEdit = (t: Testimonio) => {
    setForm({ nombre: t.nombre, cargo: t.cargo, organizacion: t.organizacion ?? '', foto: t.foto ?? '', texto: t.texto, rating: t.rating, activo: t.activo, orden: t.orden });
    setModal({ open: true, item: t });
  };

  const closeModal = () => setModal({ open: false, item: null });

  const lookupPhoto = async (nombre: string) => {
    if (!nombre.trim()) return;
    const { data } = await db.from('perfiles').select('avatar_url')
      .ilike('nombre', `%${nombre.split(' ')[0]}%`)
      .not('avatar_url', 'is', null).limit(1).maybeSingle();
    if (data?.avatar_url) {
      setForm((f) => ({ ...f, foto: data.avatar_url as string }));
      toast.success('Foto encontrada en el directorio');
    } else {
      toast('No se encontró foto para ese nombre', { icon: 'ℹ️' });
    }
  };

  const save = async () => {
    if (!form.nombre.trim() || !form.cargo.trim() || !form.texto.trim()) {
      toast.error('Nombre, cargo y testimonio son obligatorios');
      return;
    }
    setSaving(true);
    try {
      if (modal.item) {
        await updateTestimonio(modal.item.id, form);
        toast.success('Testimonio actualizado');
      } else {
        await addTestimonio(form);
        toast.success('Testimonio creado');
      }
      closeModal();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const toggleActivo = async (t: Testimonio) => {
    try {
      await updateTestimonio(t.id, { activo: !t.activo });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTestimonio(deleteTarget.id);
      toast.success('Testimonio eliminado');
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar');
    }
  };

  return (
    <div className="space-y-5 max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-surface-900">Testimonios</h2>
          <p className="text-surface-400 text-sm">Gestiona los testimonios visibles en la página principal</p>
        </div>
        <button type="button" className="btn-primary shrink-0" onClick={openCreate}>
          <Plus className="w-4 h-4" /> Nuevo testimonio
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, icon: Quote, color: 'text-surface-700 bg-surface-100' },
          { label: 'Activos', value: stats.activos, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Ocultos', value: stats.ocultos, icon: EyeOff, color: 'text-surface-400 bg-surface-50' },
          { label: 'Rating promedio', value: stats.promedio, icon: Star, color: 'text-amber-500 bg-amber-50' },
        ].map(({ label, value, icon: Icon, color }) => {
          const [text, bg] = color.split(' ');
          return (
            <div key={label} className="card p-5 flex items-center gap-4">
              <div className={classNames('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', bg)}>
                <Icon className={classNames('w-5 h-5', text)} />
              </div>
              <div>
                <p className="text-2xl font-bold text-surface-900">{value}</p>
                <p className="text-xs text-surface-500">{label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div className="card p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input className="input-field pl-9 py-2" value={search}
            onChange={(e) => setSearch(e.target.value)} placeholder="Buscar testimonios..." />
        </div>
      </div>

      {/* Grid */}
      {sorted.length === 0 ? (
        <div className="card p-16 text-center">
          <Quote className="w-12 h-12 text-surface-300 mx-auto mb-4" />
          <p className="text-surface-400 font-medium">No hay testimonios</p>
          <button type="button" className="btn-primary mt-5 mx-auto" onClick={openCreate}>
            <Plus className="w-4 h-4" /> Crear primer testimonio
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sorted.map((t) => (
            <div key={t.id} className={classNames('card p-5 flex flex-col gap-3', !t.activo && 'opacity-60')}>
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  {t.foto ? (
                    <img src={t.foto} alt={t.nombre} className="w-10 h-10 rounded-full object-cover shrink-0 ring-2 ring-emerald-100" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {t.nombre.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-surface-900 text-sm truncate">{t.nombre}</p>
                    <p className="text-xs text-emerald-600 truncate">{t.cargo}</p>
                    {t.organizacion && <p className="text-xs text-surface-400 truncate">{t.organizacion}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" onClick={() => void toggleActivo(t)}
                    aria-label={t.activo ? 'Ocultar' : 'Mostrar'}
                    className={classNames('w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
                      t.activo ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-surface-100 text-surface-400 hover:bg-surface-200')}>
                    {t.activo ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                  <button type="button" aria-label="Editar" onClick={() => openEdit(t)}
                    className="w-7 h-7 rounded-lg bg-surface-100 hover:bg-emerald-50 hover:text-emerald-600 flex items-center justify-center transition-colors text-surface-500">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" aria-label="Eliminar" onClick={() => setDeleteTarget(t)}
                    className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Stars */}
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={classNames('w-3.5 h-3.5', i < t.rating ? 'text-amber-400 fill-amber-400' : 'text-surface-200')} />
                ))}
              </div>

              {/* Text */}
              <p className="text-sm text-surface-600 leading-relaxed line-clamp-4 flex-1">"{t.texto}"</p>

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-surface-50 text-xs text-surface-400">
                <span className={classNames('px-2 py-0.5 rounded-full font-medium',
                  t.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-100 text-surface-500')}>
                  {t.activo ? 'Visible' : 'Oculto'}
                </span>
                <span>Orden {t.orden} · {t.createdAt ? timeAgo(t.createdAt) : ''}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal crear/editar */}
      {modal.open && createPortal(
        <>
          <div className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm" onClick={closeModal} />
          <div className="fixed inset-0 z-[101] flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-glass-xl w-full sm:max-w-lg max-h-[92vh] flex flex-col pointer-events-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-surface-100 shrink-0">
                <div>
                  <h3 className="font-display text-lg font-bold text-surface-900">
                    {modal.item ? 'Editar testimonio' : 'Nuevo testimonio'}
                  </h3>
                  <p className="text-xs text-surface-400 mt-0.5">
                    {modal.item ? 'Modifica los campos y guarda.' : 'Completa los datos del testimonio.'}
                  </p>
                </div>
                <button type="button" aria-label="Cerrar" onClick={closeModal}
                  className="w-8 h-8 rounded-xl hover:bg-surface-100 flex items-center justify-center text-surface-400">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto flex-1 p-5 space-y-4">
                {/* Nombre + foto */}
                <div>
                  <label className="label">Nombre *</label>
                  <div className="flex gap-2">
                    <input className="input-field flex-1" placeholder="Nombre completo" value={form.nombre}
                      onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} />
                    <button type="button" className="btn-secondary px-3 text-xs whitespace-nowrap"
                      onClick={() => void lookupPhoto(form.nombre)}>
                      Buscar foto
                    </button>
                  </div>
                  {form.foto && (
                    <div className="mt-2 flex items-center gap-2">
                      <img src={form.foto} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-100" />
                      <span className="text-xs text-emerald-600">Foto encontrada</span>
                      <button type="button" onClick={() => setForm((f) => ({ ...f, foto: '' }))}
                        className="text-xs text-surface-400 hover:text-red-500">Quitar</button>
                    </div>
                  )}
                </div>

                {/* Foto URL manual */}
                <div>
                  <label className="label">URL de foto (opcional)</label>
                  <input className="input-field" placeholder="https://..." value={form.foto}
                    onChange={(e) => setForm((f) => ({ ...f, foto: e.target.value }))} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Cargo *</label>
                    <input className="input-field" placeholder="Ej: Presidenta de Cooperativa" value={form.cargo}
                      onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Organización</label>
                    <input className="input-field" placeholder="Empresa o institución" value={form.organizacion}
                      onChange={(e) => setForm((f) => ({ ...f, organizacion: e.target.value }))} />
                  </div>
                </div>

                <div>
                  <label className="label">Testimonio *</label>
                  <textarea rows={4} className="input-field resize-none"
                    placeholder="Escribe el texto del testimonio..."
                    value={form.texto} onChange={(e) => setForm((f) => ({ ...f, texto: e.target.value }))} />
                </div>

                {/* Rating */}
                <div>
                  <label className="label">Calificación</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star} type="button" onClick={() => setForm((f) => ({ ...f, rating: star }))}
                        className="transition-transform hover:scale-110">
                        <Star className={classNames('w-7 h-7', star <= form.rating ? 'text-amber-400 fill-amber-400' : 'text-surface-200')} />
                      </button>
                    ))}
                    <span className="text-sm text-surface-500 ml-1 self-center">{form.rating}/5</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="t-orden" className="label">Orden de aparición</label>
                    <input id="t-orden" type="number" min={1} className="input-field" value={form.orden}
                      onChange={(e) => setForm((f) => ({ ...f, orden: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="label">Visibilidad</label>
                    <button type="button" onClick={() => setForm((f) => ({ ...f, activo: !f.activo }))}
                      className={classNames('w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border font-medium text-sm transition-all',
                        form.activo ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-surface-200 bg-surface-50 text-surface-500')}>
                      {form.activo ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      {form.activo ? 'Visible' : 'Oculto'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-surface-100 p-5 flex gap-3 justify-end shrink-0">
                <button type="button" className="btn-secondary" onClick={closeModal}>Cancelar</button>
                <button type="button" className="btn-primary" onClick={save} disabled={saving}>
                  {saving
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Guardando...</>
                    : <><Save className="w-4 h-4" /> {modal.item ? 'Guardar cambios' : 'Crear testimonio'}</>}
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body,
      )}

      {/* Modal confirmar eliminar */}
      {deleteTarget && createPortal(
        <>
          <div className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-2xl shadow-glass-xl w-full max-w-sm p-6 pointer-events-auto">
              <div className="w-11 h-11 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="font-display font-bold text-surface-900">¿Eliminar testimonio?</h3>
              <p className="text-sm text-surface-500 mt-1 mb-5">
                El testimonio de <strong>{deleteTarget.nombre}</strong> será eliminado permanentemente.
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
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}
