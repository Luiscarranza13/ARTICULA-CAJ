import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Calendar, Newspaper, RefreshCw, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import Badge from '../components/common/Badge';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { classNames, timeAgo } from '../lib/utils';

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

const TAB_LABELS: Record<Tab, string> = { noticias: 'Noticias', eventos: 'Eventos', convocatorias: 'Convocatorias' };
const TAB_ICONS: Record<Tab, typeof Newspaper> = { noticias: Newspaper, eventos: Calendar, convocatorias: Bell };

export default function ContentPage() {
  const [tab, setTab] = useState<Tab>('noticias');
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
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
          id: r.id, titulo: r.titulo ?? '(Sin título)', descripcion: r.contenido ?? '',
          estado: r.estado ?? 'pendiente', created_at: r.created_at ?? undefined,
        }));
      } else {
        const { data, error } = await db
          .from('eventos')
          .select('id,titulo,descripcion,fecha,lugar,created_at')
          .order('created_at', { ascending: false });
        if (error) throw error;
        rows = ((data ?? []) as { id: string; titulo: string | null; descripcion: string | null; fecha: string | null; lugar: string | null; created_at: string | null }[]).map((r) => ({
          id: r.id, titulo: r.titulo ?? '(Sin título)', descripcion: r.descripcion ?? '',
          estado: 'publicado', fecha: r.fecha ?? undefined, lugar: r.lugar ?? undefined,
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

  // Realtime
  useEffect(() => {
    const pubChannel = supabase
      .channel('content-pub-view')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'publicaciones' }, () => {
        if (mountedRef.current && tab !== 'eventos') void load();
      })
      .subscribe();
    const evtChannel = supabase
      .channel('content-evt-view')
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

  const Icon = TAB_ICONS[tab];

  return (
    <div className="space-y-5 max-w-[1400px]">
      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <button type="button" key={t} onClick={() => setTab(t)}
            className={classNames('flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all',
              tab === t ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white border border-surface-200 text-surface-600 hover:border-emerald-300')}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Búsqueda */}
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

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="md:col-span-2 xl:col-span-3 card p-10 text-center text-surface-400">
            Cargando {TAB_LABELS[tab].toLowerCase()}...
          </div>
        ) : filtered.length === 0 ? (
          <div className="md:col-span-2 xl:col-span-3 card p-10 text-center text-surface-400">
            No hay {TAB_LABELS[tab].toLowerCase()} publicadas aún.
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
                <p className="text-xs text-emerald-600 mt-1.5 font-medium">
                  {item.fecha}{item.lugar ? ` · ${item.lugar}` : ''}
                </p>
              )}
            </div>
            <div className="pt-1 border-t border-surface-50">
              <span className="text-xs text-surface-400">{item.created_at ? timeAgo(item.created_at) : '—'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
