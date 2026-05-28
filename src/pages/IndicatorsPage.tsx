import { useEffect, useState, lazy, Suspense } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Activity, Package, TrendingUp, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fetchRealKpis } from '../lib/data';
import type { PublicLandingKpis } from '../lib/data';
const GlobeIndicators = lazy(() => import('../components/three/GlobeIndicators'));

type Cadena = { id: string; nombre: string; actores: number; volumen_anual: number; impacto_economico: number };

const PIE_COLORS    = ['#10b981', '#3b82f6', '#f59e0b', '#a855f7', '#f97316', '#14b8a6'];
const PIE_BG_CLASSES = ['bg-emerald-500', 'bg-blue-500', 'bg-amber-400', 'bg-purple-500', 'bg-orange-500', 'bg-teal-500'];

export default function IndicatorsPage() {
  const [kpis, setKpis] = useState<PublicLandingKpis | null>(null);
  const [cadenas, setCadenas] = useState<Cadena[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      // KPIs reales — intenta vista, cae a conteo directo
      const kpiData = await fetchRealKpis();
      setKpis(kpiData);

      // Cadenas: intenta la vista, si falla usa tabla directa
      let cadenasData: Cadena[] = [];
      const { data: vistaData, error: vistaErr } = await supabase
        .from('v_cadenas_resumen')
        .select('id,nombre,actores,volumen_anual,impacto_economico');

      if (!vistaErr && vistaData && vistaData.length > 0) {
        cadenasData = vistaData as Cadena[];
      } else {
        const { data: tableData } = await supabase
          .from('cadenas_productivas')
          .select('id,nombre,actores,volumen_anual,impacto_economico')
          .eq('estado', 'activo');
        cadenasData = (tableData ?? []) as Cadena[];
      }
      setCadenas(cadenasData);
    } catch (error) {
      console.error('Error cargando indicadores:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    queueMicrotask(() => void load());
    const channel = supabase
      .channel('indicators-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'perfiles' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_config' }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, []);

  const barData = cadenas.map((c) => ({ nombre: c.nombre, actores: Number(c.actores ?? 0) }));
  const pieData = cadenas.map((c, i) => ({
    name: c.nombre,
    value: Number(c.impacto_economico ?? 0),
    fill: PIE_COLORS[i % PIE_COLORS.length],
    bgClass: PIE_BG_CLASSES[i % PIE_BG_CLASSES.length],
  })).filter((d) => d.value > 0);

  return (
    <div className="space-y-6 max-w-[1400px]">
      {loading ? (
        <div className="card p-10 text-center text-surface-400">Cargando indicadores...</div>
      ) : (
        <>
          {/* Globo 3D + KPIs */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Globo de Cajamarca */}
            <div className="lg:col-span-2 card overflow-hidden relative min-h-[280px]">
              <div className="absolute inset-0">
                <Suspense fallback={null}>
                  <GlobeIndicators />
                </Suspense>
              </div>
              <div className="relative z-10 p-5 pointer-events-none">
                <h3 className="font-display font-bold text-surface-900 mb-1">Cajamarca</h3>
                <p className="text-xs text-surface-500">Red productiva regional</p>
              </div>
            </div>

            {/* KPIs */}
            <div className="lg:col-span-3 grid grid-cols-2 gap-4 content-center">
              <Metric icon={Users} label="Productores activos" value={kpis?.productores_activos ?? 0} />
              <Metric icon={Package} label="Productos publicados" value={kpis?.productos_publicados ?? 0} />
              <Metric icon={Activity} label="Acuerdos comerciales" value={kpis?.acuerdos_comerciales ?? 0} />
              <Metric icon={TrendingUp} label="Ventas cerradas" value={kpis?.ventas_cerradas ?? 0} money />
            </div>
          </div>

          {/* Gráficos de cadenas */}
          {cadenas.length > 0 ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="card p-6">
                <h3 className="font-display font-bold text-surface-900 mb-1">Actores por cadena productiva</h3>
                <p className="text-xs text-surface-400 mb-5">Número de actores registrados por cada cadena</p>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="nombre" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip formatter={(v) => [Number(v).toLocaleString('es-PE'), 'Actores']} />
                    <Bar dataKey="actores" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="card p-6">
                <h3 className="font-display font-bold text-surface-900 mb-1">Impacto económico por cadena</h3>
                <p className="text-xs text-surface-400 mb-5">Ventas e impacto en soles por cadena productiva</p>
                {pieData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value">
                          {pieData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                        </Pie>
                        <Tooltip formatter={(v) => `S/ ${Number(v).toLocaleString('es-PE')}`} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1.5 mt-2">
                      {pieData.map((item) => (
                        <div key={item.name} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full flex-shrink-0 ${item.bgClass}`} />
                            <span className="text-surface-600">{item.name}</span>
                          </span>
                          <span className="font-semibold text-surface-800">S/ {item.value.toLocaleString('es-PE')}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-center text-surface-400 text-sm py-10">Sin datos de impacto económico aún.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="card p-10 text-center text-surface-400">
              <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No hay cadenas productivas registradas.</p>
              <p className="text-sm mt-1">Los gráficos aparecerán cuando haya cadenas cargadas en el sistema.</p>
            </div>
          )}

          {/* Nota sobre los datos */}
          <div className="card p-5 bg-emerald-50 border-emerald-200">
            <p className="text-sm text-emerald-800 font-medium mb-1">¿Cómo funcionan estos indicadores?</p>
            <p className="text-xs text-emerald-700 leading-relaxed">
              Los valores de <strong>Productores</strong> y <strong>Productos</strong> se calculan automáticamente desde la base de datos.
              Los <strong>Acuerdos comerciales</strong> e <strong>Impacto en ventas</strong> son editables desde{' '}
              <strong>Solicitudes → Configuración</strong>. Los gráficos de cadenas se actualizan cuando el administrador
              gestiona las cadenas productivas del directorio.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value, money = false }: { icon: typeof Users; label: string; value: number; money?: boolean }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-surface-900">
          {money ? `S/ ${Number(value).toLocaleString('es-PE')}` : Number(value).toLocaleString('es-PE')}
        </p>
        <p className="text-xs text-surface-500 leading-tight">{label}</p>
      </div>
    </div>
  );
}
