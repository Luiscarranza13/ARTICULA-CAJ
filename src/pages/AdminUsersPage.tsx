import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle2, Copy, Eye, EyeOff, Pencil, Plus, RefreshCw, Search,
  Shield, Trash2, UserRound, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createAdminUser, deleteAdminUser, fetchAdminUsers, updateAdminUser,
  type AdminUser, type AdminUserInput,
} from '../lib/adminUsers';
import { sendCredentialEmail } from '../lib/gmail';
import { classNames, getRolColor, getRolLabel, timeAgo } from '../lib/utils';
import { useStore } from '../store/useStore';
import type { UserRole } from '../types';

const roles: UserRole[] = ['productor', 'comprador', 'institucion', 'administrador'];

const emptyForm: AdminUserInput = {
  nombre: '',
  apellido: '',
  dni: '',
  celular: '',
  correo: '',
  organizacion: '',
  ubicacion: 'Cajamarca',
  rubro: '',
  rol: 'productor',
  password: '',
  verified: true,
  estado: 'aprobado',
};

export default function AdminUsersPage() {
  const siteConfig = useStore((state) => state.siteConfig);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('todos');
  const [modal, setModal] = useState<{ open: boolean; user: AdminUser | null }>({ open: false, user: null });
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await fetchAdminUsers());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudieron cargar los usuarios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch = !q || [
        user.nombre, user.apellido, user.correo, user.organizacion, user.rubro, user.ubicacion,
      ].some((value) => value?.toLowerCase().includes(q));
      const matchesRole = role === 'todos' || user.rol === role;
      return matchesSearch && matchesRole;
    });
  }, [role, search, users]);

  const stats = {
    total: users.length,
    activos: users.filter((user) => user.estado === 'aprobado').length,
    verificados: users.filter((user) => user.verified).length,
    admins: users.filter((user) => user.rol === 'administrador').length,
  };

  const openCreate = () => setModal({ open: true, user: null });
  const openEdit = (user: AdminUser) => setModal({ open: true, user });

  const saveUser = async (form: AdminUserInput, editing: AdminUser | null) => {
    setSaving(true);
    try {
      if (editing) {
        await updateAdminUser(editing.id, form, editing.authUserId);
        toast.success('Usuario actualizado');
      } else {
        const created = await createAdminUser(form);
        toast.success('Usuario creado');
        await sendCredentials(created, form.password ?? '');
      }
      setModal({ open: false, user: null });
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar el usuario');
    } finally {
      setSaving(false);
    }
  };

  const removeUser = async () => {
    if (!deleteTarget) return;
    try {
      await deleteAdminUser(deleteTarget);
      toast.success('Usuario eliminado');
      setDeleteTarget(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar el usuario');
    }
  };

  const sendCredentials = async (user: AdminUser, password: string) => {
    if (!password) {
      toast.error('No hay contraseña para enviar.');
      return;
    }

    const payload = {
      to: user.correo,
      nombre: `${user.nombre} ${user.apellido}`.trim() || user.correo,
      email: user.correo,
      password,
      loginUrl: 'https://articulacaj.novatec.ink/login',
      supportEmail: siteConfig.email,
      supportPhone: siteConfig.telefono,
      supportAddress: siteConfig.direccion,
    };

    await sendCredentialEmail(payload);
    toast.success('Credenciales enviadas automaticamente');
  };

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-surface-900">Usuarios</h2>
          <p className="text-surface-400 text-sm">Administración de cuentas, roles y perfiles de acceso.</p>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4" /> Nuevo usuario
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric label="Total" value={stats.total} icon={UserRound} />
        <Metric label="Activos" value={stats.activos} icon={CheckCircle2} color="text-emerald-600 bg-emerald-50" />
        <Metric label="Verificados" value={stats.verificados} icon={Shield} color="text-blue-600 bg-blue-50" />
        <Metric label="Admins" value={stats.admins} icon={Shield} color="text-amber-600 bg-amber-50" />
      </div>

      <div className="card p-4 flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input className="input-field pl-9 py-2" placeholder="Buscar usuarios..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select aria-label="Filtrar por rol" className="input-field py-2 sm:w-52" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="todos">Todos los roles</option>
            {roles.map((item) => <option key={item} value={item}>{getRolLabel(item)}</option>)}
          </select>
        </div>
        <button type="button" className="btn-secondary px-4" onClick={load}>
          <RefreshCw className={classNames('w-4 h-4', loading && 'animate-spin')} /> Recargar
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-surface-400">Cargando usuarios...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-surface-400">No se encontraron usuarios</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-100 bg-surface-50">
                  {['Usuario', 'Rol', 'Organización', 'Estado', 'Registro', 'Acciones'].map((head) => (
                    <th key={head} className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wide whitespace-nowrap">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-50">
                {filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-surface-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-surface-800">{user.nombre} {user.apellido}</p>
                      <p className="text-xs text-surface-400">{user.correo}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={classNames('badge', getRolColor(user.rol))}>{getRolLabel(user.rol)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-surface-700 text-xs">{user.organizacion || 'Sin organización'}</p>
                      <p className="text-surface-400 text-xs">{user.rubro || user.ubicacion}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={classNames('badge', user.estado === 'aprobado' ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-100 text-surface-600')}>
                        {user.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-surface-400 whitespace-nowrap">{timeAgo(user.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => openEdit(user)} aria-label="Editar usuario" className="w-8 h-8 rounded-lg bg-surface-100 hover:bg-emerald-50 hover:text-emerald-600 flex items-center justify-center transition-colors text-surface-500">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => setDeleteTarget(user)} aria-label="Eliminar usuario" className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-colors">
                          <Trash2 className="w-4 h-4" />
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

      <AnimatePresence>
        {modal.open && (
          <UserModal
            user={modal.user}
            saving={saving}
            onClose={() => setModal({ open: false, user: null })}
            onSave={saveUser}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <ConfirmDelete user={deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={removeUser} />
        )}
      </AnimatePresence>
    </div>
  );
}

function UserModal({ user, saving, onClose, onSave }: {
  user: AdminUser | null;
  saving: boolean;
  onClose: () => void;
  onSave: (form: AdminUserInput, editing: AdminUser | null) => void;
}) {
  const [form, setForm] = useState<AdminUserInput>(() => user ? {
    nombre: user.nombre,
    apellido: user.apellido,
    dni: user.dni,
    celular: user.celular,
    correo: user.correo,
    organizacion: user.organizacion ?? '',
    ubicacion: user.ubicacion,
    rubro: user.rubro ?? '',
    rol: user.rol,
    password: '',
    verified: user.verified,
    estado: user.estado,
  } : { ...emptyForm, password: generatePassword() });
  const [showPassword, setShowPassword] = useState(false);

  const set = (field: keyof AdminUserInput, value: string | boolean) => setForm((current) => ({ ...current, [field]: value }));
  const generate = () => set('password', generatePassword());

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.nombre.trim() || !form.correo.trim()) {
      toast.error('Nombre y correo son obligatorios');
      return;
    }
    if (!user && (!form.password || form.password.length < 8)) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    onSave(form, user);
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 32 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
        <form onSubmit={submit} className="bg-white rounded-t-3xl sm:rounded-2xl shadow-glass-xl w-full sm:max-w-2xl pointer-events-auto max-h-[92vh] flex flex-col">
          <div className="flex items-center justify-between p-5 border-b border-surface-100">
            <div>
              <h3 className="font-display text-lg font-bold text-surface-900">{user ? 'Editar usuario' : 'Nuevo usuario'}</h3>
              <p className="text-xs text-surface-400">{user ? 'Actualiza perfil, rol o contraseña.' : 'Crea acceso y envía credenciales por correo.'}</p>
            </div>
            <button type="button" aria-label="Cerrar" onClick={onClose} className="w-8 h-8 rounded-xl hover:bg-surface-100 flex items-center justify-center text-surface-400">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nombre *" value={form.nombre} onChange={(value) => set('nombre', value)} />
            <Field label="Apellido" value={form.apellido} onChange={(value) => set('apellido', value)} />
            <Field label="DNI" value={form.dni} onChange={(value) => set('dni', value)} />
            <Field label="Celular" value={form.celular} onChange={(value) => set('celular', value)} />
            <Field label="Correo *" type="email" value={form.correo} onChange={(value) => set('correo', value)} />
            <div>
              <label htmlFor="user-rol" className="label">Rol</label>
              <select id="user-rol" className="input-field" value={form.rol} onChange={(event) => set('rol', event.target.value as UserRole)}>
                {roles.map((item) => <option key={item} value={item}>{getRolLabel(item)}</option>)}
              </select>
            </div>
            <Field label="Organización" value={form.organizacion} onChange={(value) => set('organizacion', value)} />
            <Field label="Ubicación" value={form.ubicacion} onChange={(value) => set('ubicacion', value)} />
            <Field label="Rubro" value={form.rubro} onChange={(value) => set('rubro', value)} />
            <div>
              <label htmlFor="user-estado" className="label">Estado</label>
              <select id="user-estado" className="input-field" value={form.estado} onChange={(event) => set('estado', event.target.value)}>
                <option value="aprobado">Aprobado</option>
                <option value="pendiente">Pendiente</option>
                <option value="rechazado">Rechazado</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="user-password" className="label">{user ? 'Nueva contraseña (opcional)' : 'Contraseña *'}</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input id="user-password" type={showPassword ? 'text' : 'password'} className="input-field pr-10" value={form.password} onChange={(event) => set('password', event.target.value)} autoComplete="new-password" />
                  <button type="button" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setShowPassword((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button type="button" onClick={generate} className="btn-secondary px-3" title="Generar contraseña">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            <label className="sm:col-span-2 flex items-center gap-3 px-4 py-3 rounded-xl border border-surface-200 bg-surface-50 cursor-pointer">
              <input type="checkbox" checked={form.verified} onChange={(event) => set('verified', event.target.checked)} className="w-4 h-4 accent-emerald-600" />
              <span className="text-sm font-medium text-surface-700">Usuario verificado</span>
            </label>
          </div>

          <div className="border-t border-surface-100 p-5 flex flex-col sm:flex-row gap-3 sm:justify-end">
            <button type="button" onClick={onClose} className="btn-secondary justify-center">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary justify-center disabled:opacity-60">
              {saving ? 'Guardando...' : user ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </motion.div>
    </>
  );
}

function Field({ label, value, onChange, type = 'text' }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  const id = `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <input id={id} type={type} className="input-field" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function Metric({ label, value, icon: Icon, color = 'text-surface-700 bg-surface-100' }: {
  label: string;
  value: number;
  icon: typeof UserRound;
  color?: string;
}) {
  const [textColor, bgColor] = color.split(' ');
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

function ConfirmDelete({ user, onCancel, onConfirm }: {
  user: AdminUser;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-glass-xl pointer-events-auto">
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
            <Trash2 className="w-6 h-6 text-red-500" />
          </div>
          <h3 className="font-semibold text-surface-800 mb-1">Eliminar usuario</h3>
          <p className="text-sm text-surface-500 mb-5">Se eliminara el perfil y, si existe, la cuenta de autenticacion de {user.correo}.</p>
          <div className="flex gap-3">
            <button type="button" onClick={onCancel} className="btn-secondary flex-1 justify-center py-2 text-sm">Cancelar</button>
            <button type="button" onClick={onConfirm} className="flex-1 py-2 text-sm font-semibold rounded-xl bg-red-500 hover:bg-red-600 text-white transition-colors">
              Eliminar
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

function generatePassword() {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  return `Caj-${Array.from(bytes, (byte) => byte.toString(36).padStart(2, '0')).join('').slice(0, 12)}!`;
}
