import { createPortal } from 'react-dom';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2, Clock, Eye, EyeOff, Mail, RefreshCw, Search, Shield, Trash2, XCircle,
  MessageSquare, X, Settings,
  Network, TrendingUp, Phone, MapPin, Save,
  KeyRound, Copy, Users, Package,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Badge from '../components/common/Badge';
import { createAdminUser, type AdminUserInput } from '../lib/adminUsers';
import { sendCredentialEmail } from '../lib/gmail';
import { deleteSolicitud, fetchSolicitudes, updateSolicitudEstado, type SolicitudWeb } from '../lib/solicitudes';
import { supabase } from '../lib/supabase';
import { classNames, getRolLabel, timeAgo } from '../lib/utils';
import { useStore } from '../store/useStore';
import type { SiteConfig, UserRole } from '../types';

type TabId = 'solicitudes' | 'configuracion';

type CredentialForm = {
  nombre: string;
  apellido: string;
  dni: string;
  celular: string;
  correo: string;
  organizacion: string;
  ubicacion: string;
  rubro: string;
  rol: UserRole;
  password: string;
};

export default function AdminContactPage() {
  const { user, siteConfig, updateSiteConfig } = useStore();
  const [tab, setTab] = useState<TabId>('solicitudes');

  // Config form state (controlled so edits are live)
  const [configForm, setConfigForm] = useState<SiteConfig>(siteConfig);
  const [liveKpis, setLiveKpis] = useState<{ actores: number; productos: number } | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        // Intenta la vista primero; si falla, cuenta directamente
        const { data } = await supabase.from('v_dashboard_kpis').select('productores_activos,productos_publicados').maybeSingle();
        if (data?.productores_activos != null) {
          setLiveKpis({ actores: Number(data.productores_activos), productos: Number(data.productos_publicados ?? 0) });
          return;
        }
      } catch { /* vista no existe */ }
      const [a, p] = await Promise.all([
        supabase.from('perfiles').select('id', { count: 'exact', head: true }).eq('estado', 'aprobado'),
        supabase.from('productos').select('id', { count: 'exact', head: true }).eq('publicado', true),
      ]);
      setLiveKpis({ actores: a.count ?? 0, productos: p.count ?? 0 });
    })();
  }, []);

  const saveConfig = async () => {
    try {
      // Sync live counts into config before saving
      const toSave = liveKpis
        ? { ...configForm, actoresCount: liveKpis.actores, productosCount: liveKpis.productos }
        : configForm;
      await updateSiteConfig(toSave);
      toast.success('Configuración guardada');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar la configuración');
    }
  };

  // Solicitudes state
  const [solicitudes, setSolicitudes] = useState<SolicitudWeb[]>([]);
  const [search, setSearch] = useState('');
  const [estado, setEstado] = useState('todos');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SolicitudWeb | null>(null);
  const [credentialSolicitud, setCredentialSolicitud] = useState<SolicitudWeb | null>(null);
  const [credentialSaving, setCredentialSaving] = useState(false);

  const isAdmin = user?.rol === 'administrador';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSolicitudes(await fetchSolicitudes());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudieron cargar las solicitudes');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load());
    const channel = supabase
      .channel('solicitudes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'publicaciones' }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load]);

  useEffect(() => {
    queueMicrotask(() => setConfigForm(siteConfig));
  }, [siteConfig]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return solicitudes.filter((item) => {
      const matchSearch = !q || [item.nombre, item.email, item.empresa, item.producto, item.cadena, item.mensaje]
        .some((v) => v?.toLowerCase().includes(q));
      const matchEstado = estado === 'todos' || item.estado === estado;
      return matchSearch && matchEstado;
    });
  }, [estado, search, solicitudes]);

  const setSolicitudEstado = async (id: string, next: string) => {
    try {
      await updateSolicitudEstado(id, next);
      toast.success('Solicitud actualizada');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar');
    }
  };

  const removeSolicitud = async (id: string) => {
    try {
      await deleteSolicitud(id);
      toast.success('Solicitud eliminada');
      setSelected(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar');
    }
  };

  const createCredentialsFromSolicitud = async (form: CredentialForm) => {
    if (!credentialSolicitud) return;
    setCredentialSaving(true);
    try {
      const userInput: AdminUserInput = {
        nombre: form.nombre,
        apellido: form.apellido,
        dni: form.dni,
        celular: form.celular,
        correo: form.correo,
        organizacion: form.organizacion,
        ubicacion: form.ubicacion,
        rubro: form.rubro,
        rol: form.rol,
        password: form.password,
        verified: true,
        estado: 'aprobado',
      };
      const created = await createAdminUser(userInput);
      const payload = {
        to: form.correo,
        nombre: `${created.nombre} ${created.apellido}`.trim() || form.correo,
        email: form.correo,
        password: form.password,
        loginUrl: 'https://articulacaj.novatec.ink/login',
        supportEmail: siteConfig.email,
        supportPhone: siteConfig.telefono,
        supportAddress: siteConfig.direccion,
      };

      await sendCredentialEmail(payload);
      toast.success('Usuario creado y credenciales enviadas. Cambia el estado de la solicitud manualmente.');

      setCredentialSolicitud(null);
      await load();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'No se pudieron crear las credenciales';
      const friendlyMsg = msg.includes('dni') || msg.includes('unique')
        ? 'Ya existe un usuario con ese DNI o correo. Edítalo desde el panel de Usuarios.'
        : msg;
      toast.error(friendlyMsg);
    } finally {
      setCredentialSaving(false);
    }
  };

  const stats = {
    total: solicitudes.length,
    pendientes: solicitudes.filter((s) => s.estado === 'pendiente').length,
    aprobadas: solicitudes.filter((s) => s.estado === 'aprobado').length,
    rechazadas: solicitudes.filter((s) => s.estado === 'rechazado').length,
  };

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Tab navigation */}
      <div className="flex gap-1 p-1 bg-surface-100 rounded-2xl w-fit">
        {([
          { id: 'solicitudes' as TabId, label: 'Solicitudes',  icon: MessageSquare },
          { id: 'configuracion' as TabId, label: 'Configuración', icon: Settings },
        ]).map(({ id, label, icon: Icon }) => (
          <button type="button" key={id} onClick={() => setTab(id)}
            className={classNames('flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200',
              tab === id ? 'bg-white shadow-card text-surface-900' : 'text-surface-500 hover:text-surface-700')}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* ─── SOLICITUDES TAB ─── */}
      {tab === 'solicitudes' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total" value={stats.total} icon={Mail} />
            <StatCard label="Pendientes" value={stats.pendientes} icon={Clock} color="text-amber-600 bg-amber-50" />
            <StatCard label="Aprobadas" value={stats.aprobadas} icon={CheckCircle2} color="text-emerald-600 bg-emerald-50" />
            <StatCard label="Rechazadas" value={stats.rechazadas} icon={XCircle} color="text-red-500 bg-red-50" />
          </div>

          <div className="card p-4 flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input className="input-field pl-9 py-2" placeholder="Buscar solicitudes..." value={search}
                  onChange={(e) => setSearch(e.target.value)} />
              </div>
              <select aria-label="Filtrar por estado" className="input-field py-2 sm:w-48" value={estado} onChange={(e) => setEstado(e.target.value)}>
                <option value="todos">Todos los estados</option>
                <option value="pendiente">Pendientes</option>
                <option value="aprobado">Aprobadas</option>
                <option value="rechazado">Rechazadas</option>
              </select>
            </div>
            <button type="button" className="btn-secondary px-4" onClick={load}>
              <RefreshCw className={classNames('w-4 h-4', loading && 'animate-spin')} /> Recargar
            </button>
          </div>

          <div className="card overflow-hidden">
            {loading ? (
              <div className="p-10 text-center text-surface-400">Cargando solicitudes...</div>
            ) : filtered.length === 0 ? (
              <div className="p-10 text-center text-surface-400">No se encontraron solicitudes</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-100 bg-surface-50">
                      {['Solicitante', 'Tipo', 'Detalle', 'Estado', 'Fecha', 'Acciones'].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-50">
                    {filtered.map((item) => (
                      <tr key={item.id} className="hover:bg-surface-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-surface-800">{item.nombre}</p>
                          <p className="text-xs text-surface-400">{item.email}</p>
                          {item.telefono && <p className="text-xs text-surface-400">{item.telefono}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={item.tipo === 'adquisicion' ? 'emerald' : 'blue'}>{item.tipo}</Badge>
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <p className="text-surface-700 line-clamp-2 text-xs">{item.producto || item.cadena || item.mensaje}</p>
                          {item.empresa && <p className="text-xs text-surface-400">{item.empresa}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <EstadoSelect value={item.estado} onChange={(next) => setSolicitudEstado(item.id, next)} />
                        </td>
                        <td className="px-4 py-3 text-xs text-surface-400 whitespace-nowrap">{timeAgo(item.createdAt)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setSelected(item)}>Ver</button>
                            <button
                              type="button"
                              className={classNames(
                                'inline-flex items-center justify-center w-7 h-7 rounded-lg transition-colors',
                                item.estado === 'aprobado'
                                  ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                  : 'bg-surface-100 text-surface-300 cursor-not-allowed'
                              )}
                              aria-label="Crear credenciales"
                              disabled={item.estado !== 'aprobado'}
                              onClick={() => setCredentialSolicitud(item)}
                              title={item.estado === 'aprobado' ? 'Crear credenciales' : 'Aprueba la solicitud antes de crear credenciales'}
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" aria-label="Eliminar solicitud"
                              className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                              onClick={() => removeSolicitud(item.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ─── CONFIGURACIÓN TAB ─── */}
      {tab === 'configuracion' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Landing stats */}
          <div className="card p-6 space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-surface-100">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-surface-900">Estadísticas de la landing</h3>
                <p className="text-sm text-surface-400">Cifras visibles en la página pública</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Actores y Productos son auto-calculados desde la BD */}
              <AutoStatField
                label="Actores registrados"
                icon={Users}
                value={liveKpis?.actores ?? configForm.actoresCount}
              />
              <AutoStatField
                label="Productos en vitrina"
                icon={Package}
                value={liveKpis?.productos ?? configForm.productosCount}
              />
              <ConfigStatField
                label="Acuerdos comerciales"
                icon={Network}
                suffix="+"
                value={configForm.acuerdosCount}
                onChange={(v) => setConfigForm((f) => ({ ...f, acuerdosCount: v }))}
              />
              <ConfigStatField
                label="Impacto en ventas (M)"
                icon={TrendingUp}
                prefix="S/ "
                suffix="M"
                value={configForm.ventasImpacto}
                onChange={(v) => setConfigForm((f) => ({ ...f, ventasImpacto: v }))}
              />
            </div>
          </div>

          {/* Contact info */}
          <div className="card p-6 space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-surface-100">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-surface-900">Información de contacto</h3>
                <p className="text-sm text-surface-400">Aparece en el footer y la sección de contacto</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="cfg-telefono" className="label flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" /> Teléfono
                </label>
                <input id="cfg-telefono" className="input-field" value={configForm.telefono}
                  onChange={(e) => setConfigForm((f) => ({ ...f, telefono: e.target.value }))} />
              </div>
              <div>
                <label htmlFor="cfg-email" className="label flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-emerald-600" /> Correo electrónico
                </label>
                <input id="cfg-email" type="email" className="input-field" value={configForm.email}
                  onChange={(e) => setConfigForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label htmlFor="cfg-direccion" className="label flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Dirección
                </label>
                <input id="cfg-direccion" className="input-field" value={configForm.direccion}
                  onChange={(e) => setConfigForm((f) => ({ ...f, direccion: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Save button */}
          <div className="lg:col-span-2 flex justify-end">
            <button type="button" onClick={saveConfig} className="btn-primary px-8">
              <Save className="w-4 h-4" /> Guardar configuración
            </button>
          </div>
        </div>
      )}

      {/* ─── Solicitud detail modal ─── */}
      {selected && createPortal(
        <>
          <div className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
              <div className="bg-white rounded-2xl shadow-glass-xl w-full max-w-lg pointer-events-auto">
                <div className="flex items-center justify-between p-5 border-b border-surface-100">
                  <div>
                    <h3 className="font-display text-lg font-bold text-surface-900">{selected.nombre}</h3>
                    <p className="text-sm text-surface-400">{selected.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={selected.tipo === 'adquisicion' ? 'emerald' : 'blue'}>{selected.tipo}</Badge>
                    {selected.estado === 'aprobado' && (
                      <button type="button" onClick={() => { setCredentialSolicitud(selected); setSelected(null); }} className="btn-primary px-3 py-1.5 text-xs">
                        <KeyRound className="w-3.5 h-3.5" /> Credenciales
                      </button>
                    )}
                    <button type="button" aria-label="Cerrar" onClick={() => setSelected(null)} className="w-8 h-8 rounded-xl hover:bg-surface-100 flex items-center justify-center text-surface-400">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {[
                      { label: 'Teléfono', value: selected.telefono },
                      { label: 'Empresa', value: selected.empresa },
                      { label: 'Cadena', value: selected.cadena },
                      { label: 'Producto', value: selected.producto },
                      { label: 'Cantidad', value: selected.cantidad },
                      { label: 'Presupuesto', value: selected.presupuesto },
                    ].map(({ label, value }) => value ? (
                      <div key={label} className="p-3 bg-surface-50 rounded-xl">
                        <p className="text-xs text-surface-400">{label}</p>
                        <p className="font-semibold text-surface-800 text-sm">{value}</p>
                      </div>
                    ) : null)}
                  </div>
                  <div className="p-4 bg-surface-50 rounded-xl text-sm text-surface-700 leading-relaxed">{selected.mensaje}</div>
                </div>
              </div>
          </div>
        </>,
        document.body,
      )}

      {credentialSolicitud && (
        <CredentialModal
          solicitud={credentialSolicitud}
          saving={credentialSaving}
          onClose={() => setCredentialSolicitud(null)}
          onSubmit={createCredentialsFromSolicitud}
        />
      )}


      {/* Non-admin notice for solicitudes tab */}
      {tab === 'solicitudes' && !isAdmin && (
        <div className="card p-6 flex gap-4 items-start mt-0">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-surface-800 text-sm">Acceso limitado</p>
            <p className="text-xs text-surface-500 mt-0.5">Algunas acciones requieren rol de administrador para ejecutarse correctamente.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color = 'text-surface-700 bg-surface-100' }: {
  label: string; value: number; icon: typeof Mail; color?: string;
}) {
  const [bgColor, textColor] = color.split(' ');
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={classNames('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', bgColor)}>
        <Icon className={classNames('w-5 h-5', textColor)} />
      </div>
      <div>
        <p className="text-2xl font-bold text-surface-900">{value}</p>
        <p className="text-xs text-surface-500">{label}</p>
      </div>
    </div>
  );
}

function CredentialModal({ solicitud, saving, onClose, onSubmit }: {
  solicitud: SolicitudWeb;
  saving: boolean;
  onClose: () => void;
  onSubmit: (form: CredentialForm) => void;
}) {
  const [form, setForm] = useState<CredentialForm>(() => {
    const [nombre, ...apellidoParts] = solicitud.nombre.trim().split(/\s+/);
    return {
      nombre: nombre || solicitud.nombre,
      apellido: apellidoParts.join(' '),
      dni: solicitud.dni ?? '',
      celular: solicitud.telefono ?? '',
      correo: solicitud.email,
      organizacion: solicitud.organizacion ?? solicitud.empresa ?? solicitud.cadena ?? '',
      ubicacion: 'Cajamarca',
      rubro: solicitud.rubro ?? solicitud.producto ?? solicitud.cadena ?? '',
      rol: solicitud.tipo === 'adquisicion' ? 'comprador' : 'productor',
      password: generateCredentialPassword(),
    };
  });
  const [showPassword, setShowPassword] = useState(false);

  const set = (field: keyof CredentialForm, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.nombre.trim() || !form.correo.trim()) {
      toast.error('Nombre y correo son obligatorios');
      return;
    }
    if (form.password.length < 8) {
      toast.error('La contrasena debe tener al menos 8 caracteres');
      return;
    }
    onSubmit(form);
  };

  return createPortal(
    <>
      <div className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[101] flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
        <form onSubmit={submit} className="bg-white rounded-t-2xl sm:rounded-2xl shadow-glass-xl w-full sm:max-w-3xl pointer-events-auto max-h-[calc(100vh-32px)] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-surface-100 flex-shrink-0">
            <div>
              <h3 className="font-display text-lg font-bold text-surface-900">Crear credenciales</h3>
              <p className="text-xs text-surface-400">Solicitud aprobada de {solicitud.email}</p>
            </div>
            <button type="button" aria-label="Cerrar" onClick={onClose} className="w-8 h-8 rounded-xl hover:bg-surface-100 flex items-center justify-center text-surface-400">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CredentialField label="Nombre *" value={form.nombre} onChange={(value) => set('nombre', value)} />
            <CredentialField label="Apellido" value={form.apellido} onChange={(value) => set('apellido', value)} />
            <CredentialField label="DNI" value={form.dni} onChange={(value) => set('dni', value)} />
            <CredentialField label="Celular" value={form.celular} onChange={(value) => set('celular', value)} />
            <CredentialField label="Correo Gmail *" type="email" value={form.correo} onChange={(value) => set('correo', value)} />
            <div>
              <label htmlFor="credential-rol" className="label">Rol</label>
              <select id="credential-rol" className="input-field" value={form.rol} onChange={(event) => set('rol', event.target.value)}>
                {(['productor', 'comprador', 'institucion', 'administrador'] as UserRole[]).map((rol) => (
                  <option key={rol} value={rol}>{getRolLabel(rol)}</option>
                ))}
              </select>
            </div>
            <CredentialField label="Organizacion" value={form.organizacion} onChange={(value) => set('organizacion', value)} />
            <CredentialField label="Ubicacion" value={form.ubicacion} onChange={(value) => set('ubicacion', value)} />
            <div className="sm:col-span-2">
              <CredentialField label="Rubro" value={form.rubro} onChange={(value) => set('rubro', value)} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="credential-password" className="label">Contrasena *</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    id="credential-password"
                    type={showPassword ? 'text' : 'password'}
                    className="input-field pr-10"
                    value={form.password}
                    onChange={(event) => set('password', event.target.value)}
                    autoComplete="new-password"
                  />
                  <button type="button" aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'} onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button type="button" onClick={() => set('password', generateCredentialPassword())} className="btn-secondary px-3" title="Generar contrasena">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-surface-400 mt-2">Al guardar se crea el usuario y se envia el acceso al correo indicado mediante Gmail API.</p>
            </div>
          </div>

          <div className="border-t border-surface-100 p-5 flex flex-col sm:flex-row gap-3 sm:justify-end flex-shrink-0 bg-white">
            <button type="button" onClick={onClose} className="btn-secondary justify-center">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary justify-center disabled:opacity-60">
              {saving ? 'Creando...' : 'Crear y enviar'}
            </button>
          </div>
        </form>
      </div>
    </>,
    document.body
  );
}

function CredentialField({ label, value, onChange, type = 'text' }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  const id = `credential-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <input id={id} type={type} className="input-field" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function generateCredentialPassword() {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  return `Caj-${Array.from(bytes, (byte) => byte.toString(36).padStart(2, '0')).join('').slice(0, 12)}!`;
}

function EstadoSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select aria-label="Estado de la solicitud" className="input-field py-1.5 text-xs w-32" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="pendiente">Pendiente</option>
      <option value="aprobado">Aprobado</option>
      <option value="rechazado">Rechazado</option>
    </select>
  );
}

function AutoStatField({ label, value, icon: Icon }: {
  label: string; value: number; icon: typeof Mail;
}) {
  return (
    <div>
      <label className="label flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-emerald-600" /> {label}
      </label>
      <div className="input-field bg-surface-50 text-surface-700 font-semibold flex items-center justify-between">
        <span>{value.toLocaleString('es-PE')}</span>
        <span className="text-xs text-emerald-600 font-normal">Auto · BD</span>
      </div>
    </div>
  );
}

function ConfigStatField({ label, value, onChange, prefix, suffix, icon: Icon }: {
  label: string; value: number; onChange: (v: number) => void;
  prefix?: string; suffix?: string; icon: typeof Mail;
}) {
  const id = `cfg-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div>
      <label htmlFor={id} className="label flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-emerald-600" /> {label}
      </label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm font-medium pointer-events-none">{prefix}</span>}
        <input
          id={id}
          type="number"
          min={0}
          className={classNames('input-field', prefix ? 'pl-9' : '')}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm font-medium pointer-events-none">{suffix}</span>}
      </div>
    </div>
  );
}
