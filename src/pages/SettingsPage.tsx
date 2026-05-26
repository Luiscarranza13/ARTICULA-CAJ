import { useRef, useState } from 'react';
import { Bell, Camera, Moon, Save, Shield, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';

export default function SettingsPage() {
  const { user, darkMode, toggleDarkMode, updateUser } = useStore();
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(user?.avatar);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast.error('La imagen no puede superar 3 MB');
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const form = new FormData(event.currentTarget);
      let avatar = user?.avatar;

      if (avatarFile && user?.id) {
        const ext = avatarFile.name.split('.').pop() ?? 'jpg';
        const path = `${user.id}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile, { upsert: true });
        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          toast.error(`No se pudo subir la foto: ${uploadError.message}`);
        } else {
          const { data } = supabase.storage.from('avatars').getPublicUrl(path);
          avatar = data.publicUrl;
        }
      }

      const updates = {
        nombre: String(form.get('nombre') ?? user?.nombre ?? ''),
        apellido: String(form.get('apellido') ?? user?.apellido ?? ''),
        celular: String(form.get('celular') ?? user?.celular ?? ''),
        organizacion: String(form.get('organizacion') ?? user?.organizacion ?? ''),
        ubicacion: String(form.get('ubicacion') ?? user?.ubicacion ?? ''),
        rubro: String(form.get('rubro') ?? user?.rubro ?? ''),
        bio: String(form.get('bio') ?? user?.bio ?? ''),
        avatar,
      };

      if (user?.id) {
        const { error: updateError } = await supabase.from('perfiles').update({
          nombre: updates.nombre,
          apellido: updates.apellido,
          celular: updates.celular,
          organizacion: updates.organizacion,
          ubicacion_texto: updates.ubicacion,
          rubro_texto: updates.rubro,
          bio: updates.bio,
          avatar_url: avatar ?? null,
        }).eq('id', user.id);
        if (updateError) {
          console.error('Profile update error:', updateError);
          toast.error(`Error al guardar perfil: ${updateError.message}`);
          setSaving(false);
          return;
        }
      }

      updateUser(updates);
      setAvatarFile(null);
      toast.success('Perfil guardado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar el perfil');
    }
    setSaving(false);
  };

  const initials = `${user?.nombre ?? 'U'}`.charAt(0).toUpperCase();

  return (
    <div className="max-w-[1100px] space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <form onSubmit={saveProfile} className="xl:col-span-2 card p-6 space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-surface-100">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-surface-900">Perfil</h2>
              <p className="text-sm text-surface-400">Datos visibles dentro de la plataforma</p>
            </div>
          </div>

          {/* Avatar */}
          <div className="flex items-center gap-5">
            <div className="relative group flex-shrink-0">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-emerald-600 flex items-center justify-center ring-4 ring-emerald-100">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Foto de perfil" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-bold text-2xl">{initials}</span>
                )}
              </div>
              <button type="button" aria-label="Cambiar foto de perfil" onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera className="w-5 h-5 text-white" />
              </button>
            </div>
            <div>
              <p className="font-semibold text-surface-800 text-sm">{user?.nombre} {user?.apellido}</p>
              <p className="text-xs text-surface-400 mb-3">{user?.correo}</p>
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="btn-secondary px-3 py-1.5 text-xs">
                <Camera className="w-3.5 h-3.5" /> Cambiar foto
              </button>
              <p className="text-xs text-surface-400 mt-1.5">JPG, PNG o WEBP · máx. 3 MB</p>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
                aria-label="Subir foto de perfil" className="hidden" onChange={handleAvatarChange} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field name="nombre" label="Nombre" defaultValue={user?.nombre} />
            <Field name="apellido" label="Apellido" defaultValue={user?.apellido} />
            <Field name="celular" label="Celular" defaultValue={user?.celular} />
            <Field name="organizacion" label="Organización" defaultValue={user?.organizacion} />
            <Field name="ubicacion" label="Ubicación" defaultValue={user?.ubicacion} />
            <Field name="rubro" label="Rubro" defaultValue={user?.rubro} />
          </div>

          <div>
            <label htmlFor="bio" className="label">Bio</label>
            <textarea id="bio" name="bio" rows={4} className="input-field resize-none"
              defaultValue={user?.bio ?? ''} placeholder="Cuéntanos un poco sobre ti..." />
          </div>

          <div className="flex justify-end">
            <button className="btn-primary" type="submit" disabled={saving}>
              <Save className="w-4 h-4" />
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>

        <div className="space-y-6">
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-surface-100 text-surface-700 flex items-center justify-center">
                <Moon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-surface-900">Apariencia</h3>
                <p className="text-sm text-surface-400">Preferencias visuales</p>
              </div>
            </div>
            <button type="button" onClick={toggleDarkMode} className="btn-secondary w-full justify-center">
              {darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            </button>
          </div>

          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-surface-900">Notificaciones</h3>
                <p className="text-sm text-surface-400">Alertas del sistema activas</p>
              </div>
            </div>
            <div className="rounded-xl bg-surface-50 p-4 text-sm text-surface-600">
              Las notificaciones del encabezado se pueden revisar, marcar como leídas y limpiar desde el menú superior.
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-surface-900">Rol</h3>
                <p className="text-sm text-surface-500 capitalize">{user?.rol ?? 'usuario'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string }) {
  return (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      <input id={name} name={name} className="input-field" defaultValue={defaultValue ?? ''} />
    </div>
  );
}
