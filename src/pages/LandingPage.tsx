import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import type { Variants } from 'framer-motion';
import {
  ArrowRight, Check, ChevronDown, ChevronLeft, ChevronRight, Globe, Users, ShoppingBag,
  BarChart3, Leaf, Star, TrendingUp, Link2, Award, MapPin,
  MessageSquare, Shield, Zap, Menu, X, Phone, Mail,
  Coffee, Droplets, Bean, Wheat, Sprout, Hexagon,
  Landmark, Truck, Cog, Heart, Package, Network, Quote,
} from 'lucide-react';
import type { ComponentType } from 'react';
import AnimatedCounter from '../components/common/AnimatedCounter';
import toast from 'react-hot-toast';
import { fetchPublicLandingData, type PublicLandingCadena, type PublicLandingKpis } from '../lib/data';
import { submitSolicitudAndNotify } from '../lib/solicitudes';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import type { SiteConfig, Testimonio } from '../types';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: Number(i) * 0.1, ease: 'easeOut' } }),
};

const cadenas: { icon: ComponentType<{ className?: string }>; nombre: string; desc: string; actores: string; color: string; iconBg: string }[] = [
  { icon: Coffee,   nombre: 'Café',               desc: 'San Ignacio, Jaén, Chirinos',    actores: '1,240+', color: 'from-amber-50 to-amber-100 border-amber-200',       iconBg: 'bg-amber-500' },
  { icon: Droplets, nombre: 'Lácteos',            desc: 'Cajamarca, Bambamarca, Chota',   actores: '890+',   color: 'from-blue-50 to-blue-100 border-blue-200',          iconBg: 'bg-blue-500' },
  { icon: Bean,     nombre: 'Cacao',              desc: 'Jaén, San Ignacio, Cutervo',     actores: '420+',   color: 'from-amber-50 to-orange-100 border-orange-200',     iconBg: 'bg-amber-800' },
  { icon: Wheat,    nombre: 'Quinua',             desc: 'Cajamarca, Celendín',            actores: '310+',   color: 'from-emerald-50 to-emerald-100 border-emerald-200', iconBg: 'bg-emerald-600' },
  { icon: Sprout,   nombre: 'Tubérculos Nativos', desc: 'Celendín, Bambamarca, Chota',   actores: '680+',   color: 'from-orange-50 to-orange-100 border-orange-200',    iconBg: 'bg-orange-500' },
  { icon: Hexagon,  nombre: 'Apicultura',         desc: 'San Marcos, Cajabamba',          actores: '145+',   color: 'from-yellow-50 to-yellow-100 border-yellow-200',    iconBg: 'bg-yellow-500' },
];

type LandingCadenaCard = {
  icon: ComponentType<{ className?: string }>;
  nombre: string;
  desc: string;
  actores: string;
  color: string;
  iconBg: string;
};

type LandingStat = {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  color: string;
  bgColor: string;
  icon: ComponentType<{ className?: string }>;
};

const cadenaStyles = [
  { icon: Coffee, color: 'from-amber-50 to-amber-100 border-amber-200', iconBg: 'bg-amber-500' },
  { icon: Droplets, color: 'from-blue-50 to-blue-100 border-blue-200', iconBg: 'bg-blue-500' },
  { icon: Bean, color: 'from-amber-50 to-orange-100 border-orange-200', iconBg: 'bg-amber-800' },
  { icon: Wheat, color: 'from-emerald-50 to-emerald-100 border-emerald-200', iconBg: 'bg-emerald-600' },
  { icon: Sprout, color: 'from-orange-50 to-orange-100 border-orange-200', iconBg: 'bg-orange-500' },
  { icon: Hexagon, color: 'from-yellow-50 to-yellow-100 border-yellow-200', iconBg: 'bg-yellow-500' },
];

const pasos = [
  { num: '01', icon: Users,       titulo: 'Solicita acceso',   desc: 'Completa el formulario para que administración evalúe tu solicitud.' },
  { num: '02', icon: ShoppingBag, titulo: 'Publica tu oferta', desc: 'Agrega tus productos, servicios o demandas comerciales con precios y disponibilidad.' },
  { num: '03', icon: Link2,       titulo: 'Conéctate',         desc: 'Encuentra actores afines, envía mensajes y genera articulaciones comerciales.' },
  { num: '04', icon: TrendingUp,  titulo: 'Crece',             desc: 'Accede a datos, eventos, convocatorias y oportunidades de financiamiento.' },
];

const beneficios = [
  { icon: Globe,         titulo: 'Visibilidad Regional',  desc: 'Posiciona tus productos y servicios ante compradores locales, nacionales e internacionales.', iconClass: 'bg-blue-50 text-blue-600 group-hover:bg-blue-100' },
  { icon: Link2,         titulo: 'Articulación Real',     desc: 'Conecta con otros actores de la cadena productiva y genera alianzas estratégicas.',           iconClass: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100' },
  { icon: BarChart3,     titulo: 'Datos e Inteligencia',  desc: 'Accede a indicadores actualizados de producción, precios y tendencias del mercado.',           iconClass: 'bg-purple-50 text-purple-600 group-hover:bg-purple-100' },
  { icon: Award,         titulo: 'Certificaciones',       desc: 'Visibiliza tus certificaciones orgánicas, fair trade y otras para destacar tu oferta.',        iconClass: 'bg-amber-50 text-amber-600 group-hover:bg-amber-100' },
  { icon: MessageSquare, titulo: 'Comunicación Directa',  desc: 'Mensajes, foros y publicaciones para mantener el networking activo.',                          iconClass: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100' },
  { icon: Shield,        titulo: 'Plataforma Segura',     desc: 'Usuarios verificados, información confiable y un ecosistema de confianza.',                    iconClass: 'bg-rose-50 text-rose-600 group-hover:bg-rose-100' },
];

const partners: { nombre: string; icon: ComponentType<{ className?: string }> }[] = [
  { nombre: 'Gobierno Regional Cajamarca', icon: Landmark },
  { nombre: 'MIDAGRI',                     icon: Leaf },
  { nombre: 'AGRORURAL',                   icon: Truck },
  { nombre: 'DIRCETUR',                    icon: Globe },
  { nombre: 'Sierra y Selva Exportadora',  icon: Package },
  { nombre: 'PRODUCE',                     icon: Cog },
];

const defaultContactEmail = 'info@articulacaj.pe';

function TestimonioCard({ t, featured = false }: { t: Testimonio; featured?: boolean }) {
  return (
    <div className={`rounded-2xl p-6 h-full flex flex-col transition-all ${featured ? 'bg-white shadow-2xl border border-white/20' : 'bg-white/5 border border-white/10'}`}>
      <Quote className={`w-7 h-7 mb-4 flex-shrink-0 ${featured ? 'text-emerald-500' : 'text-emerald-600/50'}`} />
      <div className="flex gap-0.5 mb-3">
        {Array.from({ length: t.rating }).map((_, j) => (
          <Star key={j} className="w-4 h-4 text-amber-400 fill-amber-400" />
        ))}
      </div>
      <p className={`text-sm leading-relaxed mb-5 flex-1 ${featured ? 'text-surface-600 text-base' : 'text-white/50'}`}>
        "{t.texto}"
      </p>
      <div className="flex items-center gap-3 mt-auto pt-4 border-t border-white/10">
        {t.foto ? (
          <img src={t.foto} alt={t.nombre}
            className={`w-10 h-10 rounded-full object-cover flex-shrink-0 ${featured ? 'ring-2 ring-emerald-100' : 'ring-1 ring-white/20'}`} />
        ) : (
          <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {t.nombre.charAt(0)}
          </div>
        )}
        <div className="min-w-0">
          <p className={`font-semibold text-sm truncate ${featured ? 'text-surface-900' : 'text-white/70'}`}>{t.nombre}</p>
          <p className={`text-xs truncate ${featured ? 'text-emerald-600' : 'text-emerald-400'}`}>{t.cargo}</p>
          {t.organizacion && <p className={`text-xs truncate ${featured ? 'text-surface-400' : 'text-white/30'}`}>{t.organizacion}</p>}
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { testimonios, siteConfig } = useStore();
  const [landingKpis, setLandingKpis] = useState<PublicLandingKpis | null>(null);
  const [landingCadenas, setLandingCadenas] = useState<LandingCadenaCard[]>(cadenas);

  const stats = buildLandingStats(landingKpis, siteConfig);
  const activeTestimonios = testimonios.filter((t) => t.activo).sort((a, b) => a.orden - b.orden);

  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [cadenaIndex, setCadenaIndex] = useState(0);
  const [testimonioIndex, setTestimonioIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [contactTab, setContactTab] = useState<'contacto' | 'adquisicion'>('contacto');
  const [contactForm, setContactForm] = useState({ nombre: '', email: '', dni: '', telefono: '', organizacion: '', rubro: '', mensaje: '' });
  const [adqForm, setAdqForm] = useState({ nombre: '', email: '', dni: '', telefono: '', organizacion: '', rubro: '', empresa: '', producto: '', cadena: '', cantidad: '', presupuesto: '', mensaje: '' });
  const [sending, setSending] = useState(false);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 400], [0, -60]);

  useEffect(() => {
    const unsub = scrollY.on('change', (v) => setScrolled(v > 20));
    return () => unsub();
  }, [scrollY]);

  const navigateTestimonio = (dir: number) => {
    const n = activeTestimonios.length;
    if (n === 0) return;
    setTestimonioIndex((i) => (i + dir + n) % n);
  };

  useEffect(() => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    if (!isAutoPlaying || activeTestimonios.length < 2) return;
    autoPlayRef.current = setInterval(() => {
      const n = activeTestimonios.length;
      setTestimonioIndex((i) => (i + 1 + n) % n);
    }, 5000);
    return () => { if (autoPlayRef.current) clearInterval(autoPlayRef.current); };
  }, [isAutoPlaying, activeTestimonios.length]);

  useEffect(() => {
    const timer = window.setInterval(() => setCadenaIndex((c) => (c + 1) % landingCadenas.length), 4500);
    return () => window.clearInterval(timer);
  }, [landingCadenas.length]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchPublicLandingData();
        setLandingKpis(data.kpis);
        setLandingCadenas(toLandingCadenas(data.cadenas));
        setCadenaIndex((current) => Math.min(current, Math.max(data.cadenas.length - 1, 0)));
      } catch (error) {
        console.error('No se pudieron cargar estadisticas publicas', error);
      }
    };

    queueMicrotask(() => void load());
    const channel = supabase
      .channel('landing-public-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'perfiles' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'actores' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'publicaciones' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cadenas_productivas' }, () => void load())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const visibleCadenas = Array.from({ length: Math.min(3, landingCadenas.length) }, (_, i) => landingCadenas[(cadenaIndex + i) % landingCadenas.length]);
  const partnerTrack = [...partners, ...partners];
  const n = activeTestimonios.length;
  const leftIdx = n > 0 ? (testimonioIndex - 1 + n) % n : 0;
  const rightIdx = n > 0 ? (testimonioIndex + 1) % n : 0;

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await submitSolicitudAndNotify({ tipo: 'contacto', ...contactForm }, getNotificationEmail(siteConfig.email));
      setContactForm({ nombre: '', email: '', dni: '', telefono: '', organizacion: '', rubro: '', mensaje: '' });
      toast.success('Mensaje enviado. Te responderemos pronto.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo enviar la solicitud.');
    }
    setSending(false);
  };

  const handleAdqSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await submitSolicitudAndNotify({
        tipo: 'adquisicion',
        ...adqForm,
        organizacion: adqForm.organizacion || adqForm.empresa,
      }, getNotificationEmail(siteConfig.email));
      setAdqForm({ nombre: '', email: '', dni: '', telefono: '', organizacion: '', rubro: '', empresa: '', producto: '', cadena: '', cantidad: '', presupuesto: '', mensaje: '' });
      toast.success('Solicitud de adquisición enviada. Te contactaremos a la brevedad.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo enviar la solicitud.');
    }
    setSending(false);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-white font-sans">

      {/* NAVBAR */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 shadow-glass border-b border-surface-100' : 'bg-white/90 backdrop-blur-sm border-b border-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-emerald">
              <Leaf className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-display font-bold text-surface-900">ARTICULA</span>
              <span className="font-display font-bold ml-1 text-emerald-600">CAJ</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {[
              { label: 'Plataforma', href: '#plataforma' },
              { label: 'Cadenas', href: '#cadenas' },
              { label: 'Cómo funciona', href: '#como-funciona' },
              { label: 'Testimonios', href: '#testimonios' },
            ].map(({ label, href }) => (
              <a key={label} href={href} className="text-sm font-medium text-surface-600 hover:text-emerald-700 transition-colors">
                {label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium px-4 py-2 rounded-xl text-surface-600 hover:text-surface-900 hover:bg-surface-100 transition-colors">
              Iniciar sesión
            </Link>
            <a href="#contacto" className="btn-primary text-sm py-2">
              Solicitar acceso <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          <button type="button" aria-label={menuOpen ? 'Cerrar menu' : 'Abrir menu'} onClick={() => setMenuOpen((o) => !o)}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl text-surface-700 hover:bg-surface-100 transition-colors">
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {menuOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="md:hidden bg-white border-t border-surface-100 px-6 py-4 space-y-1">
            {[{ label: 'Plataforma', href: '#plataforma' }, { label: 'Cadenas', href: '#cadenas' }, { label: 'Cómo funciona', href: '#como-funciona' }, { label: 'Testimonios', href: '#testimonios' }].map(({ label, href }) => (
              <a key={label} href={href} onClick={() => setMenuOpen(false)}
                className="block text-sm font-medium text-surface-600 py-2.5 hover:text-emerald-700">{label}</a>
            ))}
            <div className="flex flex-col gap-2 pt-3 border-t border-surface-100">
              <Link to="/login" className="btn-secondary justify-center text-sm">Iniciar sesión</Link>
              <a href="#contacto" onClick={() => setMenuOpen(false)} className="btn-primary justify-center text-sm">Solicitar acceso</a>
            </div>
          </motion.div>
        )}
      </nav>

      {/* HERO */}
      <section id="plataforma" className="relative min-h-screen flex items-center overflow-hidden bg-white">
        {/* Background decorations */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-emerald-50 blur-3xl opacity-70" />
          <div className="absolute top-1/2 -left-20 w-96 h-96 rounded-full bg-emerald-100/40 blur-2xl" />
          <div className="absolute bottom-0 right-1/3 w-72 h-72 rounded-full bg-amber-50/60 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.022] landing-dot-grid" />
        </div>

        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[Coffee, Leaf, Wheat, ShoppingBag, BarChart3, Droplets].map((Icon, i) => (
            <motion.div key={i} className="absolute opacity-[0.10] select-none"
              style={{ left: `${8 + i * 14}%`, top: `${24 + (i % 2) * 36}%` }}
              animate={{ y: [0, -18, 0], rotate: [0, 6, -6, 0] }}
              transition={{ duration: 4 + i * 0.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}>
              <Icon className="w-10 h-10 text-emerald-500" />
            </motion.div>
          ))}
        </div>

        <motion.div style={{ y: heroY }} className="relative max-w-7xl mx-auto w-full px-6 py-32 pt-40 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="min-w-0">
            <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-medium mb-8">
              <Zap className="w-4 h-4" /> Nueva plataforma para Cajamarca
            </motion.div>

            <motion.h1 variants={fadeUp} initial="hidden" animate="visible" custom={1}
              className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-surface-950 leading-[1.08] mb-6">
              <span className="block">Conectando las</span>
              <span className="block text-emerald-600">cadenas productivas</span>
              <span className="block">de Cajamarca</span>
            </motion.h1>

            <motion.p variants={fadeUp} initial="hidden" animate="visible" custom={2}
              className="text-surface-500 text-lg leading-relaxed mb-10 max-w-xl">
              Una plataforma inteligente para productores, compradores e instituciones. Articula, conecta y potencia el desarrollo económico de la región.
            </motion.p>

            <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3} className="flex flex-col sm:flex-row gap-4 mb-12">
              <a href="#contacto"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-emerald-600 text-white font-semibold rounded-2xl shadow-emerald hover:bg-emerald-700 hover:-translate-y-0.5 transition-all duration-200">
                <Mail className="w-5 h-5" /> Solicitar acceso
              </a>
              <Link to="/login"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white border border-surface-200 text-surface-700 font-semibold rounded-2xl shadow-card hover:bg-surface-50 hover:-translate-y-0.5 transition-all duration-200">
                Iniciar sesión <ArrowRight className="w-5 h-5" />
              </Link>
            </motion.div>

            <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={4} className="flex flex-wrap items-center gap-3 text-surface-500 text-sm">
              <div className="flex -space-x-2">
                {[
                  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop',
                  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40&h=40&fit=crop',
                  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop',
                ].map((src, i) => (
                  <img key={i} src={src} alt="" className="w-8 h-8 rounded-full border-2 border-white object-cover shadow-sm" />
                ))}
              </div>
              <span>{Number(landingKpis?.productores_activos ?? 0).toLocaleString('es-PE')} productores activos en la plataforma</span>
            </motion.div>
          </div>

          {/* Stats card */}
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2} className="hidden lg:block">
            <div className="relative overflow-hidden rounded-3xl border border-surface-200 bg-white shadow-glass-xl">
              <img src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=85"
                alt="Campo productivo en Cajamarca" className="h-56 w-full object-cover" />
              <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1.5 text-sm font-semibold text-emerald-700 shadow-card">
                <Leaf className="h-4 w-4" /> Ecosistema productivo
              </div>
              <div className="grid grid-cols-2 gap-3 p-5">
                {stats.map((stat) => (
                  <div key={stat.label} className="rounded-2xl bg-surface-50 border border-surface-100 p-4 text-center">
                    <div className={`w-8 h-8 rounded-xl mx-auto mb-2 flex items-center justify-center ${stat.bgColor}`}>
                      <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    </div>
                    <p className={`font-display text-2xl font-bold ${stat.color}`}>
                      <AnimatedCounter end={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                    </p>
                    <p className="text-surface-400 text-xs mt-0.5 font-medium leading-tight">{stat.label}</p>
                  </div>
                ))}
              </div>
              <div className="mx-5 mb-5 border-t border-surface-100 pt-4">
                <div className="flex items-center gap-3 mb-1.5">
                  <div className="flex-1 bg-surface-100 rounded-full h-1.5">
                    <motion.div initial={{ width: 0 }} animate={{ width: '78%' }} transition={{ delay: 1.2, duration: 1.2, ease: 'easeOut' }}
                      className="h-1.5 bg-emerald-500 rounded-full" />
                  </div>
                  <span className="text-surface-500 text-xs font-medium">78% meta</span>
                </div>
                <p className="text-surface-400 text-xs">Productores conectados este año</p>
              </div>
            </div>
          </motion.div>
        </motion.div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-emerald-400 animate-bounce">
          <ChevronDown className="w-6 h-6" />
        </div>
      </section>

      {/* STATS BAR */}
      <section className="bg-white py-12 border-y border-surface-100">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.1 }} className="text-center group">
              <div className={`w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center transition-transform duration-200 group-hover:scale-110 ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <p className={`font-display text-3xl font-bold ${stat.color}`}>
                <AnimatedCounter end={stat.value} prefix={stat.prefix} suffix={stat.suffix} decimals={stat.decimals} />
              </p>
              <p className="text-surface-500 text-sm mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CADENAS PRODUCTIVAS */}
      <section id="cadenas" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold mb-4">Cadenas Productivas</span>
            <h2 className="section-title mb-4">Las principales cadenas de Cajamarca</h2>
            <p className="section-subtitle max-w-2xl mx-auto">Datos actualizados desde el panel: {landingCadenas.length.toLocaleString('es-PE')} cadenas productivas, {Number(landingKpis?.productores_activos ?? 0).toLocaleString('es-PE')} productores activos y {formatSales(Number(landingKpis?.ventas_cerradas ?? 0))} en ventas cerradas.</p>
          </motion.div>

          <div className="mb-8 flex justify-center gap-3">
            <button type="button" aria-label="Cadena anterior"
              onClick={() => setCadenaIndex((c) => (c - 1 + landingCadenas.length) % landingCadenas.length)}
              className="h-10 w-10 rounded-full border border-surface-200 bg-white text-surface-600 shadow-card transition hover:border-emerald-300 hover:text-emerald-700 flex items-center justify-center">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button type="button" aria-label="Siguiente cadena"
              onClick={() => setCadenaIndex((c) => (c + 1) % landingCadenas.length)}
              className="h-10 w-10 rounded-full border border-surface-200 bg-white text-surface-600 shadow-card transition hover:border-emerald-300 hover:text-emerald-700 flex items-center justify-center">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <motion.div key={cadenaIndex} initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {visibleCadenas.map((c, i) => (
              <motion.div key={c.nombre} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.08 }} whileHover={{ y: -4 }}
                className={`bg-gradient-to-br ${c.color} border rounded-2xl p-6 cursor-default transition-shadow duration-300 hover:shadow-card-hover`}>
                <div className={`w-12 h-12 ${c.iconBg} rounded-2xl flex items-center justify-center mb-4 shadow-sm`}>
                  <c.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-display font-bold text-surface-900 text-lg mb-1">{c.nombre}</h3>
                <p className="text-surface-500 text-sm mb-3 flex items-center gap-1">
                  <MapPin className="w-3 h-3 flex-shrink-0" /> {c.desc}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-surface-700">{c.actores} actores</span>
                  <ArrowRight className="w-4 h-4 text-surface-400" />
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* BENEFICIOS */}
      <section className="py-24 bg-surface-50 border-y border-surface-100">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold mb-4">¿Por qué ARTICULA CAJ?</span>
            <h2 className="section-title mb-4">Todo lo que necesitas para crecer</h2>
            <p className="section-subtitle max-w-2xl mx-auto">Una plataforma completa diseñada para el ecosistema productivo de Cajamarca.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {beneficios.map((b, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.08 }} whileHover={{ y: -4 }}
                className="bg-white card p-6 hover:shadow-card-hover transition-all duration-300 group cursor-default">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-colors ${b.iconClass}`}>
                  <b.icon className="w-6 h-6" />
                </div>
                <h3 className="font-display font-semibold text-surface-900 text-lg mb-2">{b.titulo}</h3>
                <p className="text-surface-500 text-sm leading-relaxed">{b.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section id="como-funciona" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold mb-4">Proceso simple</span>
            <h2 className="section-title mb-4">Cómo funciona la plataforma</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {pasos.map((paso, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.1 }} className="relative text-center">
                {i < pasos.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-[60%] right-[-40%] h-px bg-gradient-to-r from-emerald-200 to-emerald-100 z-0" />
                )}
                <div className="relative z-10 w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-emerald">
                  <paso.icon className="w-7 h-7 text-white" />
                </div>
                <span className="text-emerald-400 text-xs font-bold tracking-widest mb-2 block">{paso.num}</span>
                <h3 className="font-display font-bold text-surface-900 text-lg mb-2">{paso.titulo}</h3>
                <p className="text-surface-500 text-sm leading-relaxed">{paso.desc}</p>
              </motion.div>
            ))}
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-16 text-center">
            <a href="#contacto" className="btn-primary px-8 py-4 text-base shadow-emerald-lg">
              Solicitar acceso <ArrowRight className="w-5 h-5" />
            </a>
          </motion.div>
        </div>
      </section>

      {/* TESTIMONIOS — dark-bg 3-up carousel */}
      <section id="testimonios" className="py-24 relative overflow-hidden bg-emerald-950">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none blob-forest-deep" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 rounded-full blur-3xl pointer-events-none blob-forest-mid" />

        <div className="relative max-w-7xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold mb-4 badge-forest">
              Testimonios
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">Lo que dicen nuestros usuarios</h2>
            <p className="text-emerald-300 text-lg max-w-2xl mx-auto">
              Historias reales de actores que han transformado sus negocios con ARTICULA CAJ.
            </p>
          </motion.div>

          {n > 0 && (
            <div className="relative px-6"
              onMouseEnter={() => setIsAutoPlaying(false)}
              onMouseLeave={() => setIsAutoPlaying(true)}>

              {/* Cards grid */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr_1fr] gap-4 lg:gap-5 items-stretch">

                {/* Left preview */}
                <AnimatePresence mode="wait">
                  <motion.div key={`l-${leftIdx}`}
                    initial={{ opacity: 0 }} animate={{ opacity: 0.38 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="hidden lg:flex flex-col cursor-pointer"
                    onClick={() => navigateTestimonio(-1)}>
                    <TestimonioCard t={activeTestimonios[leftIdx]} />
                  </motion.div>
                </AnimatePresence>

                {/* Center — featured */}
                <AnimatePresence mode="wait">
                  <motion.div key={`c-${testimonioIndex}`}
                    initial={{ opacity: 0, y: 20, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -16, scale: 0.96 }}
                    transition={{ duration: 0.38, ease: 'easeOut' }}>
                    <TestimonioCard t={activeTestimonios[testimonioIndex]} featured />
                  </motion.div>
                </AnimatePresence>

                {/* Right preview */}
                <AnimatePresence mode="wait">
                  <motion.div key={`r-${rightIdx}`}
                    initial={{ opacity: 0 }} animate={{ opacity: 0.38 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="hidden lg:flex flex-col cursor-pointer"
                    onClick={() => navigateTestimonio(1)}>
                    <TestimonioCard t={activeTestimonios[rightIdx]} />
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Arrow buttons */}
              <button type="button" aria-label="Testimonio anterior" onClick={() => navigateTestimonio(-1)}
                className="absolute left-0 lg:-left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-white transition-all btn-glass-dark">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button type="button" aria-label="Siguiente testimonio" onClick={() => navigateTestimonio(1)}
                className="absolute right-0 lg:-right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-white transition-all btn-glass-dark">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Dot indicators */}
          {n > 1 && (
            <div className="flex justify-center gap-2 mt-10">
              {activeTestimonios.map((_, i) => (
                <button key={i} type="button" aria-label={`Testimonio ${i + 1}`}
                  onClick={() => setTestimonioIndex(i)}
                  className={`rounded-full transition-all duration-300 h-2.5 ${i === testimonioIndex ? 'w-8 bg-emerald-400' : 'w-2.5 bg-white/20 hover:bg-white/40'}`}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* PARTNERS */}
      <section className="py-16 bg-white border-b border-surface-100">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-surface-400 text-xs font-semibold mb-10 uppercase tracking-widest">
            Aliados institucionales que confían en ARTICULA CAJ
          </p>
          <div className="overflow-hidden">
            <div className="landing-marquee flex w-max items-center gap-4">
              {partnerTrack.map((p, i) => (
                <div key={`${p.nombre}-${i}`}
                  className="flex items-center gap-2.5 px-5 py-3 rounded-2xl border border-surface-200 bg-white hover:border-emerald-300 hover:bg-emerald-50 transition-all duration-200 whitespace-nowrap">
                  <p.icon className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-surface-600">{p.nombre}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CONTACTO Y ADQUISICIÓN */}
      <section id="contacto" className="py-24 bg-surface-50">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold mb-4">Contacto y Adquisición</span>
            <h2 className="section-title mb-4">Conecta con nosotros o adquiere productos</h2>
            <p className="section-subtitle max-w-2xl mx-auto">¿Tienes preguntas sobre la plataforma o quieres comprar productos de las cadenas productivas de Cajamarca?</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="bg-white rounded-3xl border border-surface-200 shadow-card overflow-hidden">
            <div className="flex border-b border-surface-100">
              {([
                { key: 'contacto' as const,    label: 'Contacto General',      icon: MessageSquare },
                { key: 'adquisicion' as const, label: 'Solicitar Adquisición', icon: ShoppingBag },
              ]).map(({ key, label, icon: Icon }) => (
                <button key={key} type="button" onClick={() => setContactTab(key)}
                  className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-all duration-200 border-b-2 ${
                    contactTab === key
                      ? 'border-emerald-500 text-emerald-700 bg-emerald-50/50'
                      : 'border-transparent text-surface-500 hover:text-surface-700 hover:bg-surface-50'
                  }`}>
                  <Icon className="w-4 h-4" /> {label}
                </button>
              ))}
            </div>

            <div className="p-8">
              {contactTab === 'contacto' ? (
                <form onSubmit={handleContactSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="label">Nombre completo *</label>
                    <input required className="input-field" placeholder="Tu nombre" value={contactForm.nombre}
                      onChange={(e) => setContactForm((f) => ({ ...f, nombre: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Correo electrónico *</label>
                    <input required type="email" className="input-field" placeholder="correo@ejemplo.com" value={contactForm.email}
                      onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Teléfono</label>
                    <input className="input-field" placeholder="+51 ..." value={contactForm.telefono}
                      onChange={(e) => setContactForm((f) => ({ ...f, telefono: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">DNI</label>
                    <input className="input-field" inputMode="numeric" placeholder="Ej: 60280906" value={contactForm.dni}
                      onChange={(e) => setContactForm((f) => ({ ...f, dni: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Organización</label>
                    <input className="input-field" placeholder="Empresa, asociación o institución" value={contactForm.organizacion}
                      onChange={(e) => setContactForm((f) => ({ ...f, organizacion: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Rubro</label>
                    <input className="input-field" placeholder="Ej: Café, lácteos, turismo" value={contactForm.rubro}
                      onChange={(e) => setContactForm((f) => ({ ...f, rubro: e.target.value }))} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="label">Mensaje *</label>
                    <textarea required rows={4} className="input-field resize-none" placeholder="¿En qué podemos ayudarte?" value={contactForm.mensaje}
                      onChange={(e) => setContactForm((f) => ({ ...f, mensaje: e.target.value }))} />
                  </div>
                  <div className="md:col-span-2 flex justify-end">
                    <button type="submit" disabled={sending} className="btn-primary px-8 py-3">
                      {sending ? 'Enviando...' : <><Mail className="w-4 h-4" /> Enviar mensaje</>}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleAdqSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="label">Nombre completo *</label>
                    <input required className="input-field" placeholder="Tu nombre" value={adqForm.nombre}
                      onChange={(e) => setAdqForm((f) => ({ ...f, nombre: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Correo electrónico *</label>
                    <input required type="email" className="input-field" placeholder="correo@ejemplo.com" value={adqForm.email}
                      onChange={(e) => setAdqForm((f) => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Teléfono</label>
                    <input className="input-field" placeholder="+51 ..." value={adqForm.telefono}
                      onChange={(e) => setAdqForm((f) => ({ ...f, telefono: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">DNI</label>
                    <input className="input-field" inputMode="numeric" placeholder="Ej: 60280906" value={adqForm.dni}
                      onChange={(e) => setAdqForm((f) => ({ ...f, dni: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Empresa / Organización</label>
                    <input className="input-field" placeholder="Nombre de tu empresa" value={adqForm.empresa}
                      onChange={(e) => setAdqForm((f) => ({ ...f, empresa: e.target.value, organizacion: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Rubro</label>
                    <input className="input-field" placeholder="Ej: Agroindustria, comercio" value={adqForm.rubro}
                      onChange={(e) => setAdqForm((f) => ({ ...f, rubro: e.target.value }))} />
                  </div>
                  <div>
                    <label htmlFor="adq-cadena" className="label">Cadena productiva *</label>
                    <select id="adq-cadena" required className="input-field" value={adqForm.cadena}
                      onChange={(e) => setAdqForm((f) => ({ ...f, cadena: e.target.value }))}>
                      <option value="">Selecciona una cadena</option>
                      {['Café', 'Lácteos', 'Cacao', 'Quinua', 'Tubérculos Nativos', 'Apicultura', 'Otro'].map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Producto específico</label>
                    <input className="input-field" placeholder="Ej: Café especial orgánico" value={adqForm.producto}
                      onChange={(e) => setAdqForm((f) => ({ ...f, producto: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Cantidad requerida *</label>
                    <input required className="input-field" placeholder="Ej: 200 kg/mes" value={adqForm.cantidad}
                      onChange={(e) => setAdqForm((f) => ({ ...f, cantidad: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Presupuesto estimado</label>
                    <input className="input-field" placeholder="Ej: S/ 5,000 - S/ 8,000" value={adqForm.presupuesto}
                      onChange={(e) => setAdqForm((f) => ({ ...f, presupuesto: e.target.value }))} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="label">Descripción de la necesidad *</label>
                    <textarea required rows={4} className="input-field resize-none"
                      placeholder="Cuéntanos más: certificaciones requeridas, frecuencia de compra, condiciones de entrega..."
                      value={adqForm.mensaje} onChange={(e) => setAdqForm((f) => ({ ...f, mensaje: e.target.value }))} />
                  </div>
                  <div className="md:col-span-2 flex justify-end">
                    <button type="submit" disabled={sending} className="btn-primary px-8 py-3">
                      {sending ? 'Enviando...' : <><ArrowRight className="w-4 h-4" /> Enviar solicitud</>}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-24 relative overflow-hidden bg-emerald-950">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl blob-forest-deep" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full blur-3xl blob-forest-mid" />
        </div>
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
            <div className="w-16 h-16 bg-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-emerald-lg">
              <Leaf className="w-8 h-8 text-white" />
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">¿Listo para articularte?</h2>
            <p className="text-emerald-300 text-lg mb-10 max-w-xl mx-auto">
              Únete a los {Number(landingKpis?.productores_activos ?? 0).toLocaleString('es-PE')} productores activos de Cajamarca que ya están conectados, creciendo y articulando oportunidades.
            </p>
            <div className="flex flex-wrap justify-center gap-5 mb-12">
              {['Acceso revisado por administración', 'Credenciales por correo', 'Soporte en español', 'Datos de Cajamarca'].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-emerald-200">
                  <Check className="w-4 h-4 text-emerald-400" /> {item}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="#contacto"
                className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold bg-white text-emerald-900 rounded-2xl hover:bg-emerald-50 hover:-translate-y-0.5 transition-all duration-200 shadow-lg">
                Solicitar acceso <ArrowRight className="w-5 h-5" />
              </a>
              <Link to="/login"
                className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-white rounded-2xl hover:-translate-y-0.5 transition-all duration-200 btn-glass-dark">
                Ya tengo credenciales
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white text-surface-500 py-16 border-t border-surface-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
                  <Leaf className="w-4 h-4 text-white" />
                </div>
                <div>
                  <span className="font-display font-bold text-surface-900">ARTICULA</span>
                  <span className="font-display font-bold text-emerald-500 ml-1">CAJ</span>
                </div>
              </div>
              <p className="text-sm leading-relaxed">Plataforma Inteligente de Articulación de Cadenas Productivas de Cajamarca, Perú.</p>
            </div>
            <div>
              <h4 className="text-surface-900 font-semibold mb-4 text-sm">Plataforma</h4>
              <ul className="space-y-2 text-sm">
                {['Directorio', 'Vitrina Comercial', 'Articulación', 'Indicadores', 'Contenidos'].map((item) => (
                  <li key={item}><a href="#" className="hover:text-emerald-600 transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-surface-900 font-semibold mb-4 text-sm">Cadenas</h4>
              <ul className="space-y-2 text-sm">
                {['Café', 'Lácteos', 'Cacao', 'Quinua', 'Tubérculos', 'Apicultura'].map((item) => (
                  <li key={item}><a href="#" className="hover:text-emerald-600 transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-surface-900 font-semibold mb-4 text-sm">Contacto</h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2"><MapPin className="w-4 h-4 text-emerald-500 flex-shrink-0" /> {siteConfig.direccion}</li>
                <li className="flex items-center gap-2"><Phone className="w-4 h-4 text-emerald-500 flex-shrink-0" /> {siteConfig.telefono}</li>
                <li className="flex items-center gap-2"><Mail className="w-4 h-4 text-emerald-500 flex-shrink-0" /> {siteConfig.email}</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-surface-100 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm">© 2026 ARTICULA CAJ. Todos los derechos reservados.</p>
            <p className="text-sm text-emerald-600 flex items-center gap-1.5">Hecho con <Heart className="w-3.5 h-3.5 fill-emerald-500 text-emerald-500" /> para Cajamarca</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function getNotificationEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : defaultContactEmail;
}

function buildLandingStats(kpis: PublicLandingKpis | null, fallback: SiteConfig): LandingStat[] {
  const fallbackSales = fallback.ventasImpacto * 1_000_000;
  const sales = Number(kpis?.ventas_cerradas ?? fallbackSales);
  const salesInMillions = sales >= 1_000_000;

  return [
    { label: 'Productores Activos', value: Number(kpis?.productores_activos ?? fallback.actoresCount), color: 'text-emerald-600', bgColor: 'bg-emerald-50', icon: Users },
    { label: 'Productos Publicados', value: Number(kpis?.productos_publicados ?? fallback.productosCount), color: 'text-blue-600', bgColor: 'bg-blue-50', icon: Package },
    { label: 'Acuerdos Comerciales', value: Number(kpis?.acuerdos_comerciales ?? fallback.acuerdosCount), color: 'text-purple-600', bgColor: 'bg-purple-50', icon: Network },
    {
      label: 'Ventas Cerradas',
      value: salesInMillions ? sales / 1_000_000 : sales,
      prefix: 'S/ ',
      suffix: salesInMillions ? 'M' : '',
      decimals: salesInMillions && sales % 1_000_000 !== 0 ? 1 : 0,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      icon: TrendingUp,
    },
  ];
}

function toLandingCadenas(rows: PublicLandingCadena[]): LandingCadenaCard[] {
  if (rows.length === 0) return cadenas;

  return rows.map((row, index) => {
    const style = cadenaStyles[index % cadenaStyles.length];
    const volume = Number(row.volumen_anual ?? 0);
    return {
      ...style,
      nombre: row.nombre,
      desc: [row.categoria, volume > 0 ? `${volume.toLocaleString('es-PE')} volumen anual` : null].filter(Boolean).join(' · ') || 'Cadena productiva',
      actores: Number(row.actores ?? 0).toLocaleString('es-PE'),
    };
  });
}

function formatSales(value: number) {
  if (value >= 1_000_000) return `S/ ${(value / 1_000_000).toLocaleString('es-PE', { maximumFractionDigits: 1 })}M`;
  return `S/ ${value.toLocaleString('es-PE')}`;
}
