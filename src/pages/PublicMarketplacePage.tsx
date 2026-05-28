import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Leaf, MapPin, Package, RefreshCw, Search, ShoppingBag, SlidersHorizontal } from 'lucide-react';
import { fetchProductos } from '../lib/data';
import { supabase } from '../lib/supabase';
import { classNames, formatCurrency, getDisponibilidadColor } from '../lib/utils';
import type { Producto } from '../types';

export default function PublicMarketplacePage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<string[]>(['Todos']);
  const [search, setSearch] = useState('');
  const [categoria, setCategoria] = useState('Todos');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProductos();
      setProductos(data.productos.filter((product) => product.disponibilidad !== 'agotado'));
      setCategorias(data.categorias);
    } catch (loadError) {
      console.error('No se pudieron cargar productos publicos', loadError);
      setError('No pudimos cargar la vitrina en este momento. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = 'Productos | ARTICULA CAJ';
    queueMicrotask(() => void load());
    const channel = supabase
      .channel('public-products-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'producto_imagenes' }, () => void load())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return productos.filter((product) => {
      const matchSearch = !q || [product.nombre, product.descripcion, product.categoria, product.ubicacion]
        .some((value) => value.toLowerCase().includes(q));
      const matchCategory = categoria === 'Todos' || product.categoria === categoria;
      return matchSearch && matchCategory;
    });
  }, [categoria, productos, search]);

  return (
    <div className="min-h-screen bg-surface-50">
      <header className="bg-white border-b border-surface-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Volver al inicio de ARTICULA CAJ">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
              <Leaf className="w-5 h-5" />
            </div>
            <div className="font-display font-bold text-surface-900 leading-none">ARTICULA <span className="text-emerald-600">CAJ</span></div>
          </Link>
          <Link to="/" className="btn-secondary py-2 text-sm">
            <ArrowLeft className="w-4 h-4" /> Volver
          </Link>
        </div>
      </header>

      <main id="main-content" className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-semibold text-emerald-700 mb-4">
              <ShoppingBag className="w-4 h-4" /> Vitrina publica en tiempo real
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-surface-950">Productos de cadenas productivas</h1>
            <p className="text-surface-500 mt-3 max-w-2xl">Consulta productos disponibles, filtra por categoria y solicita contacto desde la plataforma.</p>
          </div>
          <Link to="/#contacto" className="btn-primary">
            Solicitar adquisicion
          </Link>
        </div>

        <section aria-label="Filtros de productos" className="bg-white rounded-2xl border border-surface-200 shadow-card p-4 mb-8">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <label htmlFor="product-search" className="sr-only">Buscar productos</label>
            <input id="product-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por producto, categoria o ubicacion" className="input-field pl-10" />
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-surface-400">
            <SlidersHorizontal className="w-3.5 h-3.5" /> Categorias
          </div>
          <div className="flex gap-2 overflow-x-auto mt-2 pb-1" role="list" aria-label="Categorias de productos">
            {categorias.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategoria(item)}
                aria-pressed={categoria === item}
                className={classNames('px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-emerald-500', categoria === item ? 'bg-emerald-600 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200')}
              >
                {item}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-surface-500" aria-live="polite">
            {loading ? 'Buscando productos...' : `${filtered.length} producto${filtered.length === 1 ? '' : 's'} disponible${filtered.length === 1 ? '' : 's'}`}
          </p>
        </section>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" aria-label="Cargando productos">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="bg-white rounded-2xl border border-surface-200 shadow-card overflow-hidden">
                <div className="h-48 skeleton rounded-none" />
                <div className="p-5 space-y-3">
                  <div className="h-5 skeleton w-3/4" />
                  <div className="h-4 skeleton w-full" />
                  <div className="h-4 skeleton w-2/3" />
                  <div className="h-8 skeleton w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl border border-red-100 p-10 text-center">
            <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-500" />
            <p className="font-semibold text-surface-900">{error}</p>
            <button type="button" onClick={() => void load()} className="btn-primary mx-auto mt-5">
              <RefreshCw className="w-4 h-4" /> Reintentar
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-surface-200 p-10 text-center">
            <Package className="mx-auto mb-3 h-8 w-8 text-surface-300" />
            <p className="font-semibold text-surface-900">No hay productos disponibles para este filtro.</p>
            <p className="mt-2 text-sm text-surface-500">Prueba con otra categoria o borra la busqueda.</p>
            {(search || categoria !== 'Todos') && (
              <button type="button" onClick={() => { setSearch(''); setCategoria('Todos'); }} className="btn-secondary mx-auto mt-5">
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((product) => (
              <article key={product.id} className="bg-white rounded-2xl border border-surface-200 shadow-card overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-card-hover">
                <img src={product.imagenes[0]} alt={product.nombre} className="w-full h-48 object-cover" loading="lazy" />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-display font-bold text-surface-900 line-clamp-2">{product.nombre}</h2>
                    <span className={classNames('px-2 py-1 rounded-full text-xs font-semibold', getDisponibilidadColor(product.disponibilidad))}>{product.disponibilidad}</span>
                  </div>
                  <p className="text-sm text-surface-500 line-clamp-2 mt-2">{product.descripcion}</p>
                  <p className="font-display text-xl font-bold text-emerald-700 mt-4">{formatCurrency(product.precio)} <span className="text-xs text-surface-400 font-sans">/ {product.unidad}</span></p>
                  <div className="flex items-center gap-2 text-xs text-surface-400 mt-3">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" /> {product.ubicacion}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-surface-500 mt-3">
                    <Package className="w-3.5 h-3.5 text-emerald-600" /> {product.categoria} - {product.cantidad} {product.unidad}
                  </div>
                  <Link to="/#contacto" className="btn-secondary mt-5 w-full justify-center text-sm">
                    Solicitar informacion
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
