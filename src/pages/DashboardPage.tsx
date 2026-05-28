import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, BarChart3, Bell, Calendar, Link2, Package, ShoppingBag, TrendingUp, Users, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Badge from '../components/common/Badge';
import StatCard from '../components/common/StatCard';
import { fetchDashboardData, fetchRealKpis } from '../lib/data';
import { supabase } from '../lib/supabase';
import { formatDateShort } from '../lib/utils';
import { useStore } from '../store/useStore';
import type { Evento } from '../types';
import type { PublicLandingKpis } from '../lib/data';

type CadenaResumen = {
  id: string; nombre: string; categoria: string;
  actores: number; volumen_anual: number; impacto_economico: number;
};

type RoleStats = {
  label: string; value: string; description: string;
  icon: React.ReactNode; color: 'emerald' | 'blue' | 'purple' | 'gold';
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.4, delay: Number(i) * 0.05 } }),
};

export default function DashboardPage() {
  const { user } = useStore();
  const [kpis, setKpis] = useState<PublicLandingKpis>({});
  const [cadenas, setCadenas] = useState<CadenaResumen[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [roleStats, setRoleStats] = useState<RoleStats[]>([]);
  const [loading, setLoading] = useState(true);

  const rol = user?.rol ?? 'productor';
  const isAdmin = rol === 'administrador';

  const load = async () => {
    setLoading(true);
    try {
      const [globalData, realKpis] = await Promise.all([
        fetchDashboardData(),
        fetchRealKpis(),
      ]);
      setKpis(realKpis);
      setCadenas(globalData.cadenas as CadenaResumen[]);
      setEventos(globalData.eventos);

      // ── Stats específicos por rol ────────────────────────────────────────────
      if (rol === 'productor' && user?.id) {
        // Buscar el actor del productor
        const { data: actorData } = await supabase
          .from('actores').select('id').eq('propietario_id', user.id);
        const actorIds = (actorData ?? []).map((a: { id: string }) => a.id);

        const [misProductos, misPublicaciones, actoresTotal, eventosProximos] = await Promise.all([
          actorIds.length > 0
            ? supabase.from('productos').select('id', { count: 'exact', head: true }).in('actor_id', actorIds).eq('publicado', true)
            : Promise.resolve({ count: 0 }),
          supabase.from('publicaciones').select('id', { count: 'exact', head: true })
            .eq('autor_id', user.id).eq('estado', 'aprobado'),
          supabase.from('actores').select('id', { count: 'exact', head: true }).eq('estado', 'aprobado'),
          supabase.from('eventos').select('id', { count: 'exact', head: true })
            .gte('fecha', new Date().toISOString().slice(0, 10)),
        ]);

        setRoleStats([
          { label: 'Mis productos', value: String(misProductos.count ?? 0), description: 'publicados en vitrina', icon: <Package className="w-5 h-5" />, color: 'emerald' },
          { label: 'Mis publicaciones', value: String(misPublicaciones.count ?? 0), description: 'en articulación', icon: <Zap className="w-5 h-5" />, color: 'blue' },
          { label: 'Actores en red', value: String(actoresTotal.count ?? 0), description: 'para conectar', icon: <Users className="w-5 h-5" />, color: 'purple' },
          { label: 'Eventos próximos', value: String(eventosProximos.count ?? 0), description: 'disponibles', icon: <Calendar className="w-5 h-5" />, color: 'gold' },
        ]);

      } else if (rol === 'comprador' && user?.id) {
        const [productosDisp, actoresDisp, convocatorias, eventosProximos] = await Promise.all([
          supabase.from('productos').select('id', { count: 'exact', head: true }).eq('publicado', true),
          supabase.from('actores').select('id', { count: 'exact', head: true }).eq('estado', 'aprobado'),
          supabase.from('publicaciones').select('id', { count: 'exact', head: true })
            .eq('tipo', 'convocatoria').eq('estado', 'aprobado'),
          supabase.from('eventos').select('id', { count: 'exact', head: true })
            .gte('fecha', new Date().toISOString().slice(0, 10)),
        ]);

        setRoleStats([
          { label: 'Productos disponibles', value: String(productosDisp.count ?? 0), description: 'para adquirir', icon: <ShoppingBag className="w-5 h-5" />, color: 'emerald' },
          { label: 'Proveedores activos', value: String(actoresDisp.count ?? 0), description: 'en el directorio', icon: <Users className="w-5 h-5" />, color: 'blue' },
          { label: 'Convocatorias', value: String(convocatorias.count ?? 0), description: 'vigentes', icon: <Bell className="w-5 h-5" />, color: 'purple' },
          { label: 'Eventos próximos', value: String(eventosProximos.count ?? 0), description: 'para participar', icon: <Calendar className="w-5 h-5" />, color: 'gold' },
        ]);

      } else if (rol === 'institucion' && user?.id) {
        const [misPublicaciones, actoresReg, eventosTotal, convocatorias] = await Promise.all([
          supabase.from('publicaciones').select('id', { count: 'exact', head: true }).eq('autor_id', user.id),
          supabase.from('perfiles').select('id', { count: 'exact', head: true }).eq('estado', 'aprobado'),
          supabase.from('eventos').select('id', { count: 'exact', head: true }),
          supabase.from('publicaciones').select('id', { count: 'exact', head: true })
            .eq('tipo', 'convocatoria').eq('estado', 'aprobado'),
        ]);

        setRoleStats([
          { label: 'Mis publicaciones', value: String(misPublicaciones.count ?? 0), description: 'en articulación', icon: <Zap className="w-5 h-5" />, color: 'emerald' },
          { label: 'Actores registrados', value: String(actoresReg.count ?? 0), description: 'en la plataforma', icon: <Users className="w-5 h-5" />, color: 'blue' },
          { label: 'Eventos publicados', value: String(eventosTotal.count ?? 0), description: 'en contenidos', icon: <Calendar className="w-5 h-5" />, color: 'purple' },
          { label: 'Convocatorias activas', value: String(convocatorias.count ?? 0), description: 'vigentes', icon: <Bell className="w-5 h-5" />, color: 'gold' },
        ]);

      } else if (isAdmin) {
        // Admin: stats globales reales
        setRoleStats([
          { label: 'Productores activos', value: String(realKpis.productores_activos ?? 0), description: 'perfiles aprobados', icon: <Users className="w-5 h-5" />, color: 'emerald' },
          { label: 'Productos publicados', value: String(realKpis.productos_publicados ?? 0), description: 'en vitrina', icon: <ShoppingBag className="w-5 h-5" />, color: 'blue' },
          { label: 'Acuerdos comerciales', value: String(realKpis.acuerdos_comerciales ?? 0), description: 'registrados', icon: <Link2 className="w-5 h-5" />, color: 'purple' },
          { label: 'Ventas cerradas', value: `S/ ${Number(realKpis.ventas_cerradas ?? 0).toLocaleString('es-PE')}`, description: 'monto acumulado', icon: <TrendingUp className="w-5 h-5" />, color: 'gold' },
        ]);
      }
    } catch (err) {
      console.error('Error cargando dashboard:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    queueMicrotask(() => void load());
    const channel = supabase.channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'perfiles' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'publicaciones' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'eventos' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_config' }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const monthly = [
    { mes: 'Productores', total: kpis.productores_activos ?? 0 },
    { mes: 'Productos', total: kpis.productos_publicados ?? 0 },
    { mes: 'Acuerdos', total: kpis.acuerdos_comerciales ?? 0 },
  ];

  const pieData = cadenas.map((c, i) => ({
    name: c.nombre,
    value: Number(c.impacto_economico ?? 0),
    fill: ['#10b981', '#3b82f6', '#f59e0b', '#a855f7', '#f97316', '#14b8a6'][i % 6],
  }));

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const roleLabel: Record<string, string> = {
    productor: 'Panel de Productor',
    comprador: 'Panel de Comprador',
    institucion: 'Panel Institucional',
    administrador: 'Panel de Administración',
  };

  return (
    <div className="space-y-6 max-w-[1400px]">
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-surface-900">{greeting()}, {user?.nombre}</h2>
          <p className="text-surface-500 text-sm mt-1">{roleLabel[rol] ?? 'Panel'} · Datos en tiempo real.</p>
        </div>
        {rol === 'productor' && (
          <Link to="/app/vitrina" className="btn-primary shrink-0"><Package className="w-4 h-4" />Mis productos</Link>
        )}
        {rol === 'comprador' && (
          <Link to="/app/vitrina" className="btn-primary shrink-0"><ShoppingBag className="w-4 h-4" />Ver vitrina</Link>
        )}
        {rol === 'institucion' && (
          <Link to="/app/articulacion" className="btn-primary shrink-0"><Zap className="w-4 h-4" />Nueva publicación</Link>
        )}
        {isAdmin && (
          <Link to="/app/usuarios" className="btn-primary shrink-0"><Users className="w-4 h-4" />Gestionar usuarios</Link>
        )}
      </motion.div>

      {loading ? <div className="card p-8 text-center text-surface-400">Cargando panel...</div> : (
        <>
          {/* KPIs por rol */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {roleStats.map((item, index) => (
              <motion.div key={item.label} variants={fadeUp} initial="hidden" animate="visible" custom={index + 1}>
                <StatCard title={item.label} value={item.value} change={0} description={item.description}
                  icon={item.icon} color={item.color} className="h-full" />
              </motion.div>
            ))}
          </div>

          {/* Gráficos globales — solo admin e institución */}
          {(isAdmin || rol === 'institucion') && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 card p-6">
                <h3 className="font-display font-bold text-surface-900 mb-1">Resumen de la plataforma</h3>
                <p className="text-surface-400 text-xs mb-5">Totales actuales por categoría</p>
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
                <p className="text-surface-400 text-xs mb-5">Impacto económico en soles</p>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value">
                      {pieData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip formatter={(value) => `S/ ${Number(value).toLocaleString('es-PE')}`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-3">
                  {pieData.slice(0, 4).map((item) => (
                    <div key={item.name} className="flex justify-between text-xs">
                      <span className="text-surface-600">{item.name}</span>
                      <span className="font-semibold">S/ {item.value.toLocaleString('es-PE')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Cadenas — solo admin */}
          {isAdmin && cadenas.length > 0 && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-display font-bold text-surface-900">Cadenas productivas</h3>
                <Link to="/app/indicadores" className="text-sm text-emerald-600 flex items-center gap-1">
                  Ver más <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="space-y-3">
                {cadenas.map((cadena) => (
                  <div key={cadena.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-surface-50">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-surface-800">{cadena.nombre}</p>
                      <p className="text-xs text-surface-400">
                        {cadena.categoria} · {Number(cadena.actores ?? 0).toLocaleString('es-PE')} actores
                      </p>
                    </div>
                    <Badge variant="emerald">S/ {Number(cadena.impacto_economico ?? 0).toLocaleString('es-PE')}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Próximos eventos — todos los roles */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold text-surface-900">Próximos eventos</h3>
              <Link to="/app/contenidos" className="text-sm text-emerald-600 flex items-center gap-1">
                Ver todos <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {eventos.map((event) => (
                <div key={event.id} className="p-4 rounded-2xl bg-surface-50 flex gap-3">
                  <div className="w-12 h-12 bg-emerald-50 rounded-xl flex flex-col items-center justify-center border border-emerald-100 flex-shrink-0">
                    <span className="text-emerald-700 text-[10px] font-bold uppercase">{formatDateShort(event.fecha).split(' ')[1]}</span>
                    <span className="text-emerald-700 font-bold text-lg leading-none">{formatDateShort(event.fecha).split(' ')[0]}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-surface-800 line-clamp-1">{event.titulo}</p>
                    <p className="text-xs text-surface-400 flex items-center gap-1 mt-1">
                      <Calendar className="w-3 h-3" />{event.lugar}
                    </p>
                    <Badge variant={event.gratuito ? 'emerald' : 'gold'}>{event.gratuito ? 'Gratuito' : 'Con costo'}</Badge>
                  </div>
                </div>
              ))}
              {eventos.length === 0 && (
                <div className="md:col-span-3 text-center text-surface-400 text-sm py-4">No hay eventos próximos.</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
