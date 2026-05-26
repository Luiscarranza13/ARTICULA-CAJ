import { HelpCircle, Mail, MessageSquare, Search, Shield, ShoppingBag, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

const faqs = [
  {
    icon: Users,
    title: 'Directorio',
    text: 'Registra actores, edita sus datos y mantenlos verificados desde el modulo Directorio o desde Solicitudes si eres admin.',
    link: '/app/directorio',
  },
  {
    icon: ShoppingBag,
    title: 'Vitrina comercial',
    text: 'Publica productos, asigna categoria, actor propietario, precio, disponibilidad e imagen.',
    link: '/app/vitrina',
  },
  {
    icon: MessageSquare,
    title: 'Solicitudes',
    text: 'Las solicitudes del formulario de contacto llegan a la bandeja Solicitudes para aprobarlas, rechazarlas o eliminarlas.',
    link: '/app/admin',
  },
  {
    icon: Shield,
    title: 'Permisos',
    text: 'Las acciones dependen de las policies RLS de Supabase. Los administradores pueden gestionar todo el panel.',
    link: '/app/configuracion',
  },
];

export default function HelpPage() {
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
              <p className="text-sm text-surface-500 mt-1">Guia rapida para operar ARTICULA CAJ.</p>
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
          <h3 className="font-display font-bold text-surface-900">Soporte directo</h3>
          <p className="text-sm text-surface-500 mt-1">Para problemas de acceso, permisos o datos de Supabase.</p>
        </div>
        <a className="btn-primary justify-center" href="mailto:info@articulacaj.pe">
          <Mail className="w-4 h-4" />
          Escribir a soporte
        </a>
      </div>
    </div>
  );
}
