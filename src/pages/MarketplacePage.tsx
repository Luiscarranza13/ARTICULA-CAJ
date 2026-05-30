import { createPortal } from 'react-dom';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Edit, Heart, MapPin, MessageSquare, Package, Plus, Save, Search, Star, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Badge from '../components/common/Badge';
import { fetchProductos, firstCategoriaId } from '../lib/data';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { classNames, formatCurrency, getDisponibilidadColor } from '../lib/utils';
import { useStore } from '../store/useStore';
import type { Actor, Producto } from '../types';

const db = supabaseAdmin ?? supabase;

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
  nombre: '', descripcion: '', precio: '', unidad: 'kg',
  cantidad: '', temporada: '', actorId: '', categoriaId: '', imagen: '',
};

export default function MarketplacePage() {
  const { user } = useStore();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<string[]>(['Todos']);
  const [actores, setActores] = useState<Actor[]>([]);
  const [categoryRows, setCategoryRows] = useState<{ id: string; nombre: string }[]>([]);
  const [myActorIds, setMyActorIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [categoria, setCategoria] = useState('Todos');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selected, setSelected] = useState<Producto | null>(null);
  const [editing, setEditing] = useState<Producto | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.rol === 'administrador';
  const isComprador = user?.rol === 'comprador';
  const isProductor = user?.rol === 'productor';

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
      setCategoryRows((cats.data ?? []).map((cat) => ({ id: cat.id, nombre: cat.nombre ?? 'Sin categoría' })));

      // Obtener los actores del productor actual para filtrar sus productos
      if (user?.id && isProductor) {
        const { data: myActores } = await supabase
          .from('actores').select('id').eq('propietario_id', user.id);
        setMyActorIds((myActores ?? []).map((a: { id: string }) => a.id));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cargar la vitrina');
    }
    setLoading(false);
  };

  useEffect(() => {
    queueMicrotask(() => void load());
    const channel = supabase.channel('marketplace-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'producto_imagenes' }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    let base = productos;
    // Productor ve solo sus propios productos; si no tiene actores aún, no ve ninguno
    if (isProductor) {
      base = myActorIds.length > 0
        ? productos.filter((p) => myActorIds.includes(p.productoId))
        : [];
    }
    const q = search.toLowerCase();
    return base.filter((product) =>
      (!q || [product.nombre, product.descripcion, product.categoria].some((v) => v.toLowerCase().includes(q)))
      && (categoria === 'Todos' || product.categoria === categoria)
    );
  }, [categoria, productos, search, isProductor, myActorIds]);

  const canManage = (product: Producto) =>
    isAdmin || myActorIds.includes(product.productoId);

  const openCreate = async () => {
    let actorIds = myActorIds;

    // Si el productor no tiene actores aún, crear uno automáticamente con su info de perfil
    if (isProductor && actorIds.length === 0) {
      const nombre = user?.organizacion?.trim() || `${user?.nombre ?? ''} ${user?.apellido ?? ''}`.trim() || 'Mi organización';
      const { data: newActor, error } = await db
        .from('actores')
        .insert({
          nombre,
          tipo: 'productor',
          rubro_texto: user?.rubro || null,
          ubicacion_texto: user?.ubicacion || null,
          propietario_id: user?.id ?? null,
          contacto: user?.celular || null,
          correo: user?.correo || null,
          estado: 'aprobado',
          verificado: false,
        })
        .select('id')
        .single();

      if (error || !newActor) {
        toast.error('No se pudo crear tu perfil de vendedor. Contacta al administrador.');
        return;
      }
      actorIds = [newActor.id];
      setMyActorIds(actorIds);
    }

    const defaultCat = categoryRows[0]?.id ?? await firstCategoriaId();
    const defaultActor = isProductor && actorIds.length > 0
      ? actorIds[0]
      : actores[0]?.id ?? '';
    setEditing(null);
    setForm({ ...emptyForm, actorId: defaultActor, categoriaId: defaultCat });
    setShowForm(true);
  };

  const openEdit = (product: Producto) => {
    const category = categoryRows.find((cat) => cat.nombre === product.categoria);
    setEditing(product);
    setForm({
      nombre: product.nombre, descripcion: product.descripcion,
      precio: String(product.precio), unidad: product.unidad,
      cantidad: String(product.cantidad), temporada: product.temporada ?? '',
      actorId: product.productoId, categoriaId: category?.id ?? categoryRows[0]?.id ?? '',
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
      estado: isAdmin ? 'aprobado' : 'pendiente',
      publicado: true,
    };
    const result = editing
      ? await db.from('productos').update(payload).eq('id', editing.id).select('id').single()
      : await db.from('productos').insert(payload).select('id').single();

    if (result.error) { toast.error(result.error.message); return; }

    if (form.imagen.trim()) {
      await db.from('producto_imagenes').delete().eq('producto_id', result.data.id);
      await db.from('producto_imagenes').insert({ producto_id: result.data.id, url: form.imagen.trim(), orden: 1, alt: form.nombre });
    }
    toast.success(editing ? 'Producto actualizado' : 'Producto publicado');
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm);
    await load();
  };

  const deleteProduct = async (product: Producto) => {
    await db.from('producto_imagenes').delete().eq('producto_id', product.id);
    const { error } = await db.from('productos').delete().eq('id', product.id);
    if (error) toast.error(error.message);
    else { toast.success('Producto eliminado'); setSelected(null); await load(); }
  };

  const contactar = (product: Producto) => {
    const actor = actores.find((a) => a.id === product.productoId);
    const raw = actor?.contacto.telefono ?? '';
    const digits = raw.replace(/\D/g, '');
    if (!digits) { toast.error('Este producto no tiene número de contacto'); return; }
    // Añadir código de Perú si no tiene código de país
    const international = digits.startsWith('51') ? digits : `51${digits}`;
    const msg = encodeURIComponent(`Hola, vi tu producto "${product.nombre}" en ARTICULA CAJ y me interesa saber más. ¿Podemos coordinar?`);
    window.open(`https://wa.me/${international}?text=${msg}`, '_blank');
  };

  const toggleFav = (id: string) =>
    setFavorites((items) => items.includes(id) ? items.filter((i) => i !== id) : [...items, id]);

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-surface-900">
            {isProductor ? 'Mis productos' : `${filtered.length} productos disponibles`}
          </h2>
          <p className="text-surface-400 text-sm">
            {isComprador ? 'Explora y contacta directamente al productor por WhatsApp' : 'Vitrina comercial de la red productiva'}
          </p>
        </div>
        {!isComprador && (
          <button type="button" onClick={openCreate} className="btn-primary shrink-0">
            <Plus className="w-4 h-4" />Publicar producto
          </button>
        )}
      </div>

      <div className="card p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar productos..." className="input-field pl-10" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {categorias.map((cat) => (
            <button type="button" key={cat} onClick={() => setCategoria(cat)}
              className={classNames('px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0',
                categoria === cat ? 'bg-emerald-600 text-white shadow-emerald' : 'bg-surface-100 text-surface-600 hover:bg-surface-200')}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? <div className="card p-8 text-center text-surface-400">Cargando productos...</div> : (
        <>
          {categoria === 'Todos' && filtered.some((p) => p.destacado) && (
            <div>
              <h3 className="font-display font-bold text-surface-800 mb-4 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500" /> Productos destacados
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.filter((p) => p.destacado).map((product, index) => (
                  <ProductCard key={product.id} product={product}
                    isFav={favorites.includes(product.id)} onFav={() => toggleFav(product.id)}
                    onSelect={() => setSelected(product)} onEdit={canManage(product) ? () => openEdit(product) : undefined}
                    isComprador={isComprador} onContact={() => contactar(product)} index={index} />
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {(categoria === 'Todos' ? filtered.filter((p) => !p.destacado) : filtered).map((product, index) => (
              <ProductCard key={product.id} product={product}
                isFav={favorites.includes(product.id)} onFav={() => toggleFav(product.id)}
                onSelect={() => setSelected(product)} onEdit={canManage(product) ? () => openEdit(product) : undefined}
                isComprador={isComprador} onContact={() => contactar(product)} index={index} />
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="card p-10 text-center text-surface-400">
              {isProductor
                ? myActorIds.length === 0
                  ? 'Aún no tienes perfil de vendedor. Haz clic en "Publicar producto" para crearlo automáticamente y publicar tu primer producto.'
                  : 'No tienes productos publicados aún. ¡Publica tu primer producto!'
                : 'No se encontraron productos.'}
            </div>
          )}
        </>
      )}

      {/* Modal detalle */}
      {selected && createPortal(
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-glass-xl w-full sm:max-w-lg overflow-hidden max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <img src={selected.imagenes[0]} alt={selected.nombre} className="w-full h-56 object-cover" />
            <div className="p-6 space-y-4">
              <div className="flex justify-between gap-4">
                <h3 className="font-display font-bold text-xl text-surface-900">{selected.nombre}</h3>
                <button type="button" aria-label="Cerrar" onClick={() => setSelected(null)}><X className="w-5 h-5" /></button>
              </div>
              <p className="text-sm text-surface-600">{selected.descripcion}</p>
              <div className="grid grid-cols-2 gap-3">
                <Info label="Precio" value={`${formatCurrency(selected.precio)} / ${selected.unidad}`} />
                <Info label="Disponible" value={`${selected.cantidad} ${selected.unidad}`} />
                <Info label="Categoría" value={selected.categoria} />
                <Info label="Ubicación" value={selected.ubicacion} />
              </div>
              <div className="flex gap-3">
                <button type="button" className="btn-primary flex-1 justify-center" onClick={() => contactar(selected)}>
                  <MessageSquare className="w-4 h-4" />Contactar por WhatsApp
                </button>
                {canManage(selected) && (
                  <>
                    <button type="button" aria-label="Editar" className="btn-secondary" onClick={() => { openEdit(selected); setSelected(null); }}>
                      <Edit className="w-4 h-4" />
                    </button>
                    <button type="button" aria-label="Eliminar" className="inline-flex items-center justify-center w-11 rounded-xl bg-red-500 text-white" onClick={() => deleteProduct(selected)}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Modal formulario */}
      {showForm && createPortal(
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowForm(false)}>
          <ProductFormView form={form} setForm={setForm}
            actors={isProductor ? actores.filter((a) => myActorIds.includes(a.id)) : actores}
            categories={categoryRows} editing={editing}
            onCancel={() => setShowForm(false)} onSave={saveProduct} isAdmin={isAdmin} />
        </div>,
        document.body,
      )}
    </div>
  );
}

function ProductCard({ product, isFav, onFav, onSelect, onEdit, onContact, isComprador, index }: {
  product: Producto; isFav: boolean; onFav: () => void; onSelect: () => void;
  onEdit?: () => void; onContact: () => void; isComprador: boolean; index: number;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }} className="card overflow-hidden group">
      <div className="relative overflow-hidden">
        <img src={product.imagenes[0]} alt={product.nombre} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer" onClick={onSelect} />
        <button type="button" onClick={onFav} aria-label="Favorito"
          className={classNames('absolute top-3 right-3 w-9 h-9 rounded-xl flex items-center justify-center shadow-sm', isFav ? 'bg-red-500 text-white' : 'bg-white/90 text-surface-500')}>
          <Heart className={classNames('w-4 h-4', isFav && 'fill-current')} />
        </button>
        {product.destacado && <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-amber-500 text-white text-xs font-bold">Destacado</div>}
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-display font-bold text-surface-900 text-sm leading-snug line-clamp-2 flex-1 cursor-pointer" onClick={onSelect}>{product.nombre}</h3>
          {onEdit && !isComprador && (
            <button type="button" aria-label="Editar producto" onClick={onEdit} className="text-surface-400 hover:text-emerald-700 flex-shrink-0">
              <Edit className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="text-surface-400 text-xs leading-relaxed line-clamp-2 mb-3">{product.descripcion}</p>
        <div className="flex items-center justify-between mb-3">
          <span className="font-display text-xl font-bold text-emerald-700">{formatCurrency(product.precio)}</span>
          <span className={classNames('px-2 py-1 rounded-full text-xs font-semibold', getDisponibilidadColor(product.disponibilidad))}>{product.disponibilidad}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-surface-400 mb-3"><MapPin className="w-3.5 h-3.5 text-emerald-500" />{product.ubicacion}</div>
        <div className="flex gap-2 mb-3">
          <Badge variant="gray" size="sm"><Package className="w-3 h-3" />{product.categoria}</Badge>
          <Badge variant="emerald" size="sm"><CheckCircle className="w-3 h-3" />{product.cantidad} {product.unidad}</Badge>
        </div>
        {isComprador && (
          <button type="button" className="w-full btn-primary py-2 text-xs justify-center" onClick={onContact}>
            <MessageSquare className="w-3.5 h-3.5" />Contactar por WhatsApp
          </button>
        )}
      </div>
    </motion.div>
  );
}

function ProductFormView({ form, setForm, actors, categories, editing, onCancel, onSave, isAdmin }: {
  form: ProductForm; setForm: React.Dispatch<React.SetStateAction<ProductForm>>;
  actors: Actor[]; categories: { id: string; nombre: string }[];
  editing: Producto | null; onCancel: () => void; onSave: () => void; isAdmin: boolean;
}) {
  const set = (field: keyof ProductForm, value: string) => setForm((c) => ({ ...c, [field]: value }));
  return (
    <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-glass-xl w-full sm:max-w-xl p-6 space-y-4 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
      <h3 className="font-display text-lg font-bold text-surface-900">{editing ? 'Editar producto' : 'Publicar producto'}</h3>
      <div>
        <label htmlFor="prod-nombre" className="label">Nombre *</label>
        <input id="prod-nombre" className="input-field" placeholder="Nombre del producto" value={form.nombre} onChange={(e) => set('nombre', e.target.value)} />
      </div>
      <div>
        <label htmlFor="prod-desc" className="label">Descripción</label>
        <textarea id="prod-desc" className="input-field resize-none" rows={3} placeholder="Descripción" value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="prod-precio" className="label">Precio (S/)</label>
          <input id="prod-precio" className="input-field" placeholder="0.00" value={form.precio} onChange={(e) => set('precio', e.target.value)} />
        </div>
        <div>
          <label htmlFor="prod-unidad" className="label">Unidad</label>
          <input id="prod-unidad" className="input-field" placeholder="kg, litros..." value={form.unidad} onChange={(e) => set('unidad', e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="prod-cant" className="label">Cantidad disponible</label>
          <input id="prod-cant" className="input-field" placeholder="0" value={form.cantidad} onChange={(e) => set('cantidad', e.target.value)} />
        </div>
        <div>
          <label htmlFor="prod-temp" className="label">Temporada</label>
          <input id="prod-temp" className="input-field" placeholder="Todo el año" value={form.temporada} onChange={(e) => set('temporada', e.target.value)} />
        </div>
      </div>
      {isAdmin && (
        <div>
          <label htmlFor="prod-actor" className="label">Actor propietario</label>
          <select id="prod-actor" className="input-field" value={form.actorId} onChange={(e) => set('actorId', e.target.value)}>
            <option value="">Seleccionar actor</option>
            {actors.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        </div>
      )}
      <div>
        <label htmlFor="prod-cat" className="label">Categoría</label>
        <select id="prod-cat" className="input-field" value={form.categoriaId} onChange={(e) => set('categoriaId', e.target.value)}>
          {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.nombre}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="prod-img" className="label">URL de imagen</label>
        <input id="prod-img" className="input-field" placeholder="https://..." value={form.imagen} onChange={(e) => set('imagen', e.target.value)} />
      </div>
      <div className="flex gap-3 justify-end">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancelar</button>
        <button type="button" className="btn-primary" onClick={onSave}><Save className="w-4 h-4" />Guardar</button>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-surface-50 rounded-xl">
      <p className="text-xs text-surface-400">{label}</p>
      <p className="font-semibold text-surface-800">{value}</p>
    </div>
  );
}
