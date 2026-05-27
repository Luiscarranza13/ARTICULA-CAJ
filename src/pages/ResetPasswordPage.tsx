import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowRight, Eye, EyeOff, Leaf, Lock, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [canReset, setCanReset] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setCanReset(Boolean(data.session));
      setCheckingSession(false);
      if (!data.session) {
        setMessage('Este enlace no es valido o ya expiro. Solicita uno nuevo desde el login.');
      }
    };

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setCanReset(true);
        setMessage('');
        setCheckingSession(false);
      }
    });

    void checkSession();

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canReset) {
      toast.error('Solicita un nuevo enlace de recuperacion.');
      return;
    }
    if (password.length < 8) {
      toast.error('La contrasena debe tener al menos 8 caracteres');
      return;
    }
    if (password !== confirm) {
      toast.error('Las contrasenas no coinciden');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    await supabase.auth.signOut();
    toast.success('Contrasena actualizada. Ingresa con tu nueva clave.');
    navigate('/login');
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
          <h1 className="font-display text-2xl font-bold text-surface-900">Crea una nueva contrasena</h1>
          <p className="text-surface-500 text-sm mt-1">Usa una clave segura para recuperar tu acceso</p>
        </motion.div>

        <motion.form onSubmit={handleSubmit} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card p-8 shadow-glass space-y-5">
          <div className={`flex gap-3 rounded-2xl border p-4 text-sm ${message ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-100 bg-emerald-50 text-emerald-800'}`}>
            {message ? <AlertCircle className="w-5 h-5 flex-shrink-0" /> : <ShieldCheck className="w-5 h-5 flex-shrink-0" />}
            <p>{message || 'Despues de actualizar tu contrasena, deberas iniciar sesion nuevamente.'}</p>
          </div>

          <PasswordField
            id="new-password"
            label="Nueva contrasena"
            value={password}
            show={showPassword}
            onToggle={() => setShowPassword((current) => !current)}
            onChange={setPassword}
          />
          <PasswordField
            id="confirm-password"
            label="Confirmar contrasena"
            value={confirm}
            show={showPassword}
            onToggle={() => setShowPassword((current) => !current)}
            onChange={setConfirm}
          />

          <button type="submit" disabled={loading || checkingSession || !canReset} className="w-full btn-primary justify-center py-3 text-sm font-semibold disabled:opacity-60">
            {loading || checkingSession ? 'Validando...' : <span className="flex items-center gap-2">Guardar contrasena <ArrowRight className="w-4 h-4" /></span>}
          </button>

          {!canReset && !checkingSession && (
            <Link to="/login" className="btn-secondary justify-center w-full py-3 text-sm">
              Volver al login
            </Link>
          )}
        </motion.form>
      </div>
    </div>
  );
}

function PasswordField({ id, label, value, show, onToggle, onChange }: {
  id: string;
  label: string;
  value: string;
  show: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <div className="relative">
        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="input-field pl-10 pr-10"
          autoComplete="new-password"
        />
        <button type="button" onClick={onToggle} aria-label={show ? 'Ocultar contrasena' : 'Mostrar contrasena'} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 transition-colors">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
