import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, Package, TrendingUp, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

type Kpis = {
  productores_activos: number;
  productos_publicados: number;
  acuerdos_comerciales: number;
  cadenas_activas: number;
  ventas_cerradas: number;
};

type Cadena = { id: string; nombre: string; actores: number; volumen_anual: number; impacto_economico: number };

export default function IndicatorsPage() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [cadenas, setCadenas] = useState<Cadena[]>([]);

  const load = async () => {
    const [kpiRes, cadenasRes] = await Promise.all([
      supabase.from('v_dashboard_kpis').select('*').maybeSingle(),
      supabase.from('v_cadenas_resumen').select('id,nombre,actores,volumen_anual,impacto_economico'),
    ]);
    if (kpiRes.error || cadenasRes.error) {
      toast.error(kpiRes.error?.message ?? cadenasRes.error?.message ?? 'No se pudieron cargar indicadores');
      return;
    }
    setKpis(kpiRes.data as Kpis);
    setCadenas((cadenasRes.data ?? []) as Cadena[]);
  };

  useEffect(() => {
    queueMicrotask(() => void load());
  }, []);

  const chart = cadenas.map((item) => ({ nombre: item.nombre, actores: item.actores, impacto: item.impacto_economico }));

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric icon={Users} label="Productores" value={kpis?.productores_activos ?? 0} />
        <Metric icon={Package} label="Productos" value={kpis?.productos_publicados ?? 0} />
        <Metric icon={Activity} label="Acuerdos" value={kpis?.acuerdos_comerciales ?? 0} />
        <Metric icon={TrendingUp} label="Ventas" value={kpis?.ventas_cerradas ?? 0} money />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-display font-bold text-surface-900 mb-1">Actores por cadena</h3>
          <p className="text-xs text-surface-400 mb-5">Vista v_cadenas_resumen</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="nombre" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip />
              <Bar dataKey="actores" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-6">
          <h3 className="font-display font-bold text-surface-900 mb-1">Impacto economico</h3>
          <p className="text-xs text-surface-400 mb-5">Soles por cadena productiva</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="nombre" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip formatter={(value) => `S/ ${Number(value).toLocaleString('es-PE')}`} />
              <Bar dataKey="impacto" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, money = false }: { icon: typeof Users; label: string; value: number; money?: boolean }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center"><Icon className="w-5 h-5" /></div>
      <div>
        <p className="text-2xl font-bold text-surface-900">{money ? `S/ ${value.toLocaleString('es-PE')}` : value.toLocaleString('es-PE')}</p>
        <p className="text-xs text-surface-500">{label}</p>
      </div>
    </div>
  );
}
