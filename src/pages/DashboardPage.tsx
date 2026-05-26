import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, BarChart3, Calendar, Link2, ShoppingBag, TrendingUp, Users, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Badge from '../components/common/Badge';
import StatCard from '../components/common/StatCard';
import { fetchDashboardData } from '../lib/data';
import { supabase } from '../lib/supabase';
import { formatDateShort, timeAgo } from '../lib/utils';
import { useStore } from '../store/useStore';
import type { Evento, Publicacion } from '../types';

type DashboardKpis = {
  productores_activos?: number;
  productos_publicados?: number;
  acuerdos_comerciales?: number;
  cadenas_activas?: number;
  ventas_cerradas?: number;
};

type CadenaResumen = {
  id: string;
  nombre: string;
  categoria: string;
  actores: number;
  volumen_anual: number;
  impacto_economico: number;
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.4, delay: Number(i) * 0.05 } }),
};

export default function DashboardPage() {
  const { user } = useStore();
  const [kpis, setKpis] = useState<DashboardKpis>({});
  const [cadenas, setCadenas] = useState<CadenaResumen[]>([]);
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await fetchDashboardData();
    setKpis((data.kpis ?? {}) as DashboardKpis);
    setCadenas(data.cadenas as CadenaResumen[]);
    setPublicaciones(data.publicaciones);
    setEventos(data.eventos);
    setLoading(false);
  };

  useEffect(() => {
    queueMicrotask(() => void load());
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'perfiles' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'publicaciones' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'eventos' }, () => void load())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const monthly = [
    { mes: 'Usuarios', total: kpis.productores_activos ?? 0 },
    { mes: 'Productos', total: kpis.productos_publicados ?? 0 },
    { mes: 'Acuerdos', total: kpis.acuerdos_comerciales ?? 0 },
    { mes: 'Cadenas', total: kpis.cadenas_activas ?? 0 },
  ];

  const pieData = cadenas.map((cadena, index) => ({
    name: cadena.nombre,
    value: Number(cadena.impacto_economico ?? 0),
    fill: ['#10b981', '#3b82f6', '#f59e0b', '#a855f7', '#f97316', '#14b8a6'][index % 6],
  }));

  return (
    <div className="space-y-6 max-w-[1400px]">
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-surface-900">Buenos dias, {user?.nombre}</h2>
          <p className="text-surface-500 text-sm mt-1">Resumen actualizado desde Supabase en tiempo real.</p>
        </div>
        <Link to="/app/vitrina" className="btn-primary shrink-0"><Zap className="w-4 h-4" />Nueva publicacion</Link>
      </motion.div>

      {loading ? <div className="card p-8 text-center text-surface-400">Cargando indicadores...</div> : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: 'Productores activos', value: String(kpis.productores_activos ?? 0), change: 0, desc: 'perfiles activos', icon: <Users className="w-5 h-5" />, color: 'emerald' as const },
              { title: 'Productos publicados', value: String(kpis.productos_publicados ?? 0), change: 0, desc: 'vitrina comercial', icon: <ShoppingBag className="w-5 h-5" />, color: 'blue' as const },
              { title: 'Acuerdos comerciales', value: String(kpis.acuerdos_comerciales ?? 0), change: 0, desc: 'operaciones registradas', icon: <Link2 className="w-5 h-5" />, color: 'purple' as const },
              { title: 'Ventas cerradas', value: `S/ ${Number(kpis.ventas_cerradas ?? 0).toLocaleString('es-PE')}`, change: 0, desc: 'monto acumulado', icon: <TrendingUp className="w-5 h-5" />, color: 'gold' as const },
            ].map((item, index) => <motion.div key={item.title} variants={fadeUp} initial="hidden" animate="visible" custom={index + 1}><StatCard {...item} className="h-full" /></motion.div>)}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 card p-6">
              <h3 className="font-display font-bold text-surface-900 mb-1">Actividad por modulo</h3>
              <p className="text-surface-400 text-xs mb-5">Datos actuales de vistas y tablas operativas</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '12px' }} />
                  <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-6">
              <h3 className="font-display font-bold text-surface-900 mb-1">Impacto por cadena</h3>
              <p className="text-surface-400 text-xs mb-5">Vista v_cadenas_resumen</p>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value">
                    {pieData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip formatter={(value) => `S/ ${Number(value).toLocaleString('es-PE')}`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {pieData.slice(0, 4).map((item) => <div key={item.name} className="flex justify-between text-xs"><span className="text-surface-600">{item.name}</span><span className="font-semibold">S/ {item.value.toLocaleString('es-PE')}</span></div>)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 card p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-display font-bold text-surface-900">Cadenas productivas</h3>
                <Link to="/app/indicadores" className="text-sm text-emerald-600 flex items-center gap-1">Ver mas <ArrowRight className="w-3.5 h-3.5" /></Link>
              </div>
              <div className="space-y-3">
                {cadenas.map((cadena) => (
                  <div key={cadena.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-surface-50">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center"><BarChart3 className="w-5 h-5" /></div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-surface-800">{cadena.nombre}</p>
                      <p className="text-xs text-surface-400">{cadena.categoria} · {cadena.actores} actores · {Number(cadena.volumen_anual ?? 0).toLocaleString('es-PE')} volumen anual</p>
                    </div>
                    <Badge variant="emerald">S/ {Number(cadena.impacto_economico ?? 0).toLocaleString('es-PE')}</Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-6">
              <h3 className="font-display font-bold text-surface-900 mb-5">Actividad reciente</h3>
              <div className="space-y-4">
                {publicaciones.map((pub) => (
                  <div key={pub.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">{pub.autorNombre.slice(0, 2).toUpperCase()}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-surface-700">{pub.autorNombre}</p>
                      <p className="text-xs text-surface-500 line-clamp-2">{pub.contenido}</p>
                      <p className="text-xs text-surface-400 mt-1">{timeAgo(pub.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold text-surface-900">Proximos eventos</h3>
              <Link to="/app/contenidos" className="text-sm text-emerald-600 flex items-center gap-1">Ver todos <ArrowRight className="w-3.5 h-3.5" /></Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {eventos.map((event) => (
                <div key={event.id} className="p-4 rounded-2xl bg-surface-50 flex gap-3">
                  <div className="w-12 h-12 bg-emerald-50 rounded-xl flex flex-col items-center justify-center border border-emerald-100">
                    <span className="text-emerald-700 text-[10px] font-bold uppercase">{formatDateShort(event.fecha).split(' ')[1]}</span>
                    <span className="text-emerald-700 font-bold text-lg leading-none">{formatDateShort(event.fecha).split(' ')[0]}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-surface-800 line-clamp-1">{event.titulo}</p>
                    <p className="text-xs text-surface-400 flex items-center gap-1 mt-1"><Calendar className="w-3 h-3" />{event.lugar}</p>
                    <Badge variant={event.gratuito ? 'emerald' : 'gold'}>{event.gratuito ? 'Gratuito' : 'Con costo'}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
