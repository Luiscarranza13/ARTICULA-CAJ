import { useState } from 'react';
import { HelpCircle, Mail, MessageSquare, Save, Search, Shield, ShoppingBag, Users, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { submitSolicitudAndNotify } from '../lib/solicitudes';
import { useStore } from '../store/useStore';

const faqs = [
  {
    icon: Users,
    title: 'Directorio',
    text: 'Explora el directorio de productores, asociaciones e instituciones de las cadenas productivas de Cajamarca.',
    link: '/app/directorio',
  },
  {
    icon: ShoppingBag,
    title: 'Vitrina comercial',
    text: 'Publica y consulta productos disponibles, con precios, disponibilidad e información de contacto del productor.',
    link: '/app/vitrina',
  },
  {
    icon: MessageSquare,
    title: 'Articulación',
    text: 'Comparte publicaciones, oportunidades y convocatorias con la red de actores de la plataforma.',
    link: '/app/articulacion',
  },
  {
    icon: Shield,
    title: 'Configuración',
    text: 'Actualiza tu perfil, foto, datos de contacto y preferencias de apariencia.',
    link: '/app/configuracion',
  },
];

export default function HelpPage() {
  const { user, siteConfig } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ asunto: '', mensaje: '' });
  const [sending, setSending] = useState(false);

  const handleSoporte = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.asunto.trim() || !form.mensaje.trim()) {
      toast.error('Completa el asunto y el mensaje');
      return;
    }
    setSending(true);
    try {
      await submitSolicitudAndNotify(
        {
          tipo: 'contacto',
          nombre: user ? `${user.nombre} ${user.apellido}`.trim() : 'Usuario',
          email: user?.correo ?? '',
          telefono: user?.celular ?? '',
          organizacion: user?.organizacion ?? '',
          rubro: user?.rubro ?? '',
          mensaje: `[SOPORTE TÉCNICO] ${form.asunto}\n\n${form.mensaje}`,
        },
        siteConfig.email,
      );
      toast.success('Mensaje enviado al administrador');
      setShowModal(false);
      setForm({ asunto: '', mensaje: '' });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo enviar el mensaje');
    }
    setSending(false);
  };

  return (
    <div className="max-w-[1100px] space-y-6">
      <div className="card p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-surface-900">Centro de ayuda</h2>
              <p className="text-sm text-surface-500 mt-1">Guía rápida para usar ARTICULA CAJ.</p>
            </div>
          </div>
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input className="input-field pl-9 py-2" placeholder="Buscar ayuda..." />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {faqs.map((item) => (
          <Link key={item.title} to={item.link} className="card p-5 hover:shadow-card-hover transition-all">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-surface-50 text-emerald-700 flex items-center justify-center flex-shrink-0">
                <item.icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-surface-900">{item.title}</h3>
                <p className="text-sm text-surface-500 mt-2 leading-relaxed">{item.text}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-display font-bold text-surface-900">Soporte técnico</h3>
          <p className="text-sm text-surface-500 mt-1">¿Tienes un problema? Envía un mensaje al administrador.</p>
        </div>
        <button type="button" className="btn-primary justify-center" onClick={() => setShowModal(true)}>
          <Mail className="w-4 h-4" />
          Contactar soporte
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-glass-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-surface-900">Mensaje al administrador</h3>
              <button type="button" aria-label="Cerrar" onClick={() => setShowModal(false)} className="text-surface-400 hover:text-surface-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSoporte} className="space-y-4">
              <div>
                <label htmlFor="soporte-asunto" className="label">Asunto *</label>
                <input id="soporte-asunto" className="input-field" placeholder="Describe brevemente el problema"
                  value={form.asunto} onChange={(e) => setForm((f) => ({ ...f, asunto: e.target.value }))} />
              </div>
              <div>
                <label htmlFor="soporte-mensaje" className="label">Mensaje *</label>
                <textarea id="soporte-mensaje" className="input-field resize-none" rows={5}
                  placeholder="Describe el problema con el mayor detalle posible..."
                  value={form.mensaje} onChange={(e) => setForm((f) => ({ ...f, mensaje: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" disabled={sending} className="btn-primary">
                  <Save className="w-4 h-4" />
                  {sending ? 'Enviando...' : 'Enviar mensaje'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
