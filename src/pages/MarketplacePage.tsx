import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Edit, Heart, MapPin, MessageSquare, Package, Plus, Save, Search, Star, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Badge from '../components/common/Badge';
import { fetchProductos, firstCategoriaId } from '../lib/data';
import { supabase } from '../lib/supabase';
import { classNames, formatCurrency, getDisponibilidadColor } from '../lib/utils';
import { useStore } from '../store/useStore';
import type { Actor, Producto } from '../types';

type ProductForm = {
  nombre: string;
  descripcion: string;
  precio: string;
  unidad: string;
  cantidad: string;
  temporada: string;
  actorId: string;
  categoriaId: string;
  imagen: string;
};

const emptyForm: ProductForm = {
  nombre: '',
  descripcion: '',
  precio: '',
  unidad: 'kg',
  cantidad: '',
  temporada: '',
  actorId: '',
  categoriaId: '',
  imagen: '',
};

export default function MarketplacePage() {
  const { user } = useStore();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<string[]>(['Todos']);
  const [actores, setActores] = useState<Actor[]>([]);
  const [categoryRows, setCategoryRows] = useState<{ id: string; nombre: string }[]>([]);
  const [search, setSearch] = useState('');
  const [categoria, setCategoria] = useState('Todos');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selected, setSelected] = useState<Producto | null>(null);
  const [editing, setEditing] = useState<Producto | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [data, cats] = await Promise.all([
        fetchProductos(),
        supabase.from('categorias_producto').select('id,nombre').order('nombre'),
      ]);
      if (cats.error) throw cats.error;
      setProductos(data.productos);
      setCategorias(data.categorias);
      setActores(data.actores);
      setCategoryRows((cats.data ?? []).map((cat) => ({ id: cat.id, nombre: cat.nombre ?? 'Sin categoria' })));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cargar la vitrina');
    }
    setLoading(false);
  };

  useEffect(() => {
    queueMicrotask(() => void load());
    const channel = supabase
      .channel('marketplace-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'producto_imagenes' }, () => void load())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const filtered = useMemo(() => productos.filter((product) => {
    const q = search.toLowerCase();
    return (!q || [product.nombre, product.descripcion, product.categoria].some((value) => value.toLowerCase().includes(q)))
      && (categoria === 'Todos' || product.categoria === categoria);
  }), [categoria, productos, search]);

  const openCreate = async () => {
    const defaultCategory = categoryRows[0]?.id ?? await firstCategoriaId();
    setEditing(null);
    setForm({ ...emptyForm, actorId: actores[0]?.id ?? '', categoriaId: defaultCategory });
    setShowForm(true);
  };

  const openEdit = (product: Producto) => {
    const category = categoryRows.find((cat) => cat.nombre === product.categoria);
    setEditing(product);
    setForm({
      nombre: product.nombre,
      descripcion: product.descripcion,
      precio: String(product.precio),
      unidad: product.unidad,
      cantidad: String(product.cantidad),
      temporada: product.temporada ?? '',
      actorId: product.productoId,
      categoriaId: category?.id ?? categoryRows[0]?.id ?? '',
      imagen: product.imagenes[0] ?? '',
    });
    setShowForm(true);
  };

  const saveProduct = async () => {
    if (!form.nombre.trim()) return;
    const payload = {
      actor_id: form.actorId || null,
      categoria_id: form.categoriaId || null,
      nombre: form.nombre,
      descripcion: form.descripcion,
      precio: Number(form.precio || 0),
      moneda: 'PEN',
      unidad: form.unidad,
      disponibilidad: Number(form.cantidad || 0),
      temporada: form.temporada || null,
      destacado: editing?.destacado ?? false,
      estado: user?.rol === 'administrador' ? 'aprobado' : 'pendiente',
      publicado: true,
    };

    const result = editing
      ? await supabase.from('productos').update(payload).eq('id', editing.id).select('id').single()
      : await supabase.from('productos').insert(payload).select('id').single();

    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    if (form.imagen.trim()) {
      await supabase.from('producto_imagenes').delete().eq('producto_id', result.data.id);
      await supabase.from('producto_imagenes').insert({ producto_id: result.data.id, url: form.imagen.trim(), orden: 1, alt: form.nombre });
    }

    toast.success(editing ? 'Producto actualizado' : 'Producto publicado');
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm);
    await load();
  };

  const deleteProduct = async (product: Producto) => {
    await supabase.from('producto_imagenes').delete().eq('producto_id', product.id);
    const { error } = await supabase.from('productos').delete().eq('id', product.id);
    if (error) toast.error(error.message);
    else {
      toast.success('Producto eliminado');
      setSelected(null);
      await load();
    }
  };

  const toggleFav = (id: string) => setFavorites((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-surface-900">{filtered.length} productos disponibles</h2>
          <p className="text-surface-400 text-sm">Vitrina sincronizada con Supabase en tiempo real</p>
        </div>
        <button onClick={openCreate} className="btn-primary shrink-0"><Plus className="w-4 h-4" />Publicar producto</button>
      </div>

      <div className="card p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar productos..." className="input-field pl-10" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {categorias.map((cat) => (
            <button key={cat} onClick={() => setCategoria(cat)} className={classNames('px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0', categoria === cat ? 'bg-emerald-600 text-white shadow-emerald' : 'bg-surface-100 text-surface-600 hover:bg-surface-200')}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? <div className="card p-8 text-center text-surface-400">Cargando productos...</div> : (
        <>
          {categoria === 'Todos' && filtered.some((product) => product.destacado) && (
            <div>
              <h3 className="font-display font-bold text-surface-800 mb-4 flex items-center gap-2"><Star className="w-4 h-4 text-amber-500" /> Productos destacados</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.filter((product) => product.destacado).map((product, index) => (
                  <ProductCard key={product.id} product={product} isFav={favorites.includes(product.id)} onFav={() => toggleFav(product.id)} onSelect={() => setSelected(product)} onEdit={() => openEdit(product)} index={index} />
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {(categoria === 'Todos' ? filtered.filter((product) => !product.destacado) : filtered).map((product, index) => (
              <ProductCard key={product.id} product={product} isFav={favorites.includes(product.id)} onFav={() => toggleFav(product.id)} onSelect={() => setSelected(product)} onEdit={() => openEdit(product)} index={index} />
            ))}
          </div>
        </>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-glass-xl w-full max-w-lg overflow-hidden" onClick={(event) => event.stopPropagation()}>
            <img src={selected.imagenes[0]} alt={selected.nombre} className="w-full h-56 object-cover" />
            <div className="p-6 space-y-4">
              <div className="flex justify-between gap-4">
                <h3 className="font-display font-bold text-xl text-surface-900">{selected.nombre}</h3>
                <button aria-label="Cerrar" onClick={() => setSelected(null)}><X className="w-5 h-5" /></button>
              </div>
              <p className="text-sm text-surface-600">{selected.descripcion}</p>
              <div className="grid grid-cols-2 gap-3">
                <Info label="Precio" value={`${formatCurrency(selected.precio)} / ${selected.unidad}`} />
                <Info label="Disponible" value={`${selected.cantidad} ${selected.unidad}`} />
                <Info label="Categoria" value={selected.categoria} />
                <Info label="Ubicacion" value={selected.ubicacion} />
              </div>
              <div className="flex gap-3">
                <button className="btn-primary flex-1 justify-center"><MessageSquare className="w-4 h-4" />Contactar</button>
                <button className="btn-secondary flex-1 justify-center" onClick={() => openEdit(selected)}><Edit className="w-4 h-4" />Editar</button>
                <button className="inline-flex items-center justify-center w-11 rounded-xl bg-red-500 text-white" onClick={() => deleteProduct(selected)}><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <ProductFormView form={form} setForm={setForm} actors={actores} categories={categoryRows} editing={editing} onCancel={() => setShowForm(false)} onSave={saveProduct} />
        </div>
      )}
    </div>
  );
}

function ProductCard({ product, isFav, onFav, onSelect, onEdit, index }: {
  product: Producto;
  isFav: boolean;
  onFav: () => void;
  onSelect: () => void;
  onEdit: () => void;
  index: number;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }} className="card overflow-hidden group">
      <div className="relative overflow-hidden">
        <img src={product.imagenes[0]} alt={product.nombre} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer" onClick={onSelect} />
        <button onClick={onFav} aria-label="Favorito" className={classNames('absolute top-3 right-3 w-9 h-9 rounded-xl flex items-center justify-center shadow-sm', isFav ? 'bg-red-500 text-white' : 'bg-white/90 text-surface-500')}>
          <Heart className={classNames('w-4 h-4', isFav && 'fill-current')} />
        </button>
        {product.destacado && <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-amber-500 text-white text-xs font-bold">Destacado</div>}
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-display font-bold text-surface-900 text-sm leading-snug line-clamp-2 flex-1 cursor-pointer" onClick={onSelect}>{product.nombre}</h3>
          <button aria-label="Editar producto" onClick={onEdit} className="text-surface-400 hover:text-emerald-700"><Edit className="w-4 h-4" /></button>
        </div>
        <p className="text-surface-400 text-xs leading-relaxed line-clamp-2 mb-3">{product.descripcion}</p>
        <div className="flex items-center justify-between mb-3">
          <span className="font-display text-xl font-bold text-emerald-700">{formatCurrency(product.precio)}</span>
          <span className={classNames('px-2 py-1 rounded-full text-xs font-semibold', getDisponibilidadColor(product.disponibilidad))}>{product.disponibilidad}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-surface-400 mb-3"><MapPin className="w-3.5 h-3.5 text-emerald-500" />{product.ubicacion}</div>
        <div className="flex gap-2">
          <Badge variant="gray" size="sm"><Package className="w-3 h-3" />{product.categoria}</Badge>
          <Badge variant="emerald" size="sm"><CheckCircle className="w-3 h-3" />{product.cantidad} {product.unidad}</Badge>
        </div>
      </div>
    </motion.div>
  );
}

function ProductFormView({ form, setForm, actors, categories, editing, onCancel, onSave }: {
  form: ProductForm;
  setForm: React.Dispatch<React.SetStateAction<ProductForm>>;
  actors: Actor[];
  categories: { id: string; nombre: string }[];
  editing: Producto | null;
  onCancel: () => void;
  onSave: () => void;
}) {
  const set = (field: keyof ProductForm, value: string) => setForm((current) => ({ ...current, [field]: value }));
  return (
    <div className="bg-white rounded-2xl shadow-glass-xl w-full max-w-xl p-6 space-y-4" onClick={(event) => event.stopPropagation()}>
      <h3 className="font-display text-lg font-bold text-surface-900">{editing ? 'Editar producto' : 'Publicar producto'}</h3>
      <input className="input-field" placeholder="Nombre" value={form.nombre} onChange={(e) => set('nombre', e.target.value)} />
      <textarea className="input-field resize-none" rows={3} placeholder="Descripcion" value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <input className="input-field" placeholder="Precio" value={form.precio} onChange={(e) => set('precio', e.target.value)} />
        <input className="input-field" placeholder="Unidad" value={form.unidad} onChange={(e) => set('unidad', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input className="input-field" placeholder="Cantidad disponible" value={form.cantidad} onChange={(e) => set('cantidad', e.target.value)} />
        <input className="input-field" placeholder="Temporada" value={form.temporada} onChange={(e) => set('temporada', e.target.value)} />
      </div>
      <select className="input-field" value={form.actorId} onChange={(e) => set('actorId', e.target.value)}>
        <option value="">Seleccionar actor</option>
        {actors.map((actor) => <option key={actor.id} value={actor.id}>{actor.nombre}</option>)}
      </select>
      <select className="input-field" value={form.categoriaId} onChange={(e) => set('categoriaId', e.target.value)}>
        {categories.map((category) => <option key={category.id} value={category.id}>{category.nombre}</option>)}
      </select>
      <input className="input-field" placeholder="URL de imagen" value={form.imagen} onChange={(e) => set('imagen', e.target.value)} />
      <div className="flex gap-3 justify-end">
        <button className="btn-secondary" onClick={onCancel}>Cancelar</button>
        <button className="btn-primary" onClick={onSave}><Save className="w-4 h-4" />Guardar</button>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="p-3 bg-surface-50 rounded-xl"><p className="text-xs text-surface-400">{label}</p><p className="font-semibold text-surface-800">{value}</p></div>;
}
