import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Leaf, ArrowRight, Lock, Mail, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../store/useStore';
import { getCurrentProfile, supabase } from '../lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Completa todos los campos');
      return;
    }

    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setError('Correo o contrasena incorrectos');
      setLoading(false);
      return;
    }

    try {
      const profile = await getCurrentProfile();
      if (!profile) {
        await supabase.auth.signOut();
        setError('Tu usuario no tiene perfil asociado en la plataforma');
        setLoading(false);
        return;
      }

      login(profile);
      toast.success('Bienvenido de vuelta');
      navigate('/app/dashboard');
    } catch {
      setError('No se pudo cargar tu perfil. Revisa los permisos de la BD.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-surface-50 mesh-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-emerald">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <p className="font-display font-bold text-surface-900 leading-none">ARTICULA</p>
              <p className="font-display font-bold text-emerald-600 leading-none text-sm">CAJ</p>
            </div>
          </Link>
          <h1 className="font-display text-2xl font-bold text-surface-900">Bienvenido de vuelta</h1>
          <p className="text-surface-500 text-sm mt-1">Ingresa a tu cuenta para continuar</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-8 shadow-glass">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm mb-5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="label">Correo electronico</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  className="input-field pl-10"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="label">Contrasena</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  className="input-field pl-10 pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  aria-label={showPass ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary justify-center py-3 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Ingresando...
                </span>
              ) : (
                <span className="flex items-center gap-2">Ingresar <ArrowRight className="w-4 h-4" /></span>
              )}
            </button>
          </form>

          <p className="text-xs text-surface-400 mt-5 leading-relaxed">
            El acceso es solo para usuarios aprobados por administracion. Las credenciales se entregan por correo.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
