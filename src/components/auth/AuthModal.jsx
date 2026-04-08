import { useState } from 'react';
import { X, Mail, Lock, User, Building2, Users, Eye, EyeOff, Chrome } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { supabaseConfigured } from '../../lib/supabase.js';

export function AuthModal({ dark, onClose, defaultTab = 'login', defaultRole = 'client' }) {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [tab, setTab]           = useState(defaultTab); // 'login' | 'signup'
  const [role, setRole]         = useState(defaultRole); // 'creator' | 'client'
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [form, setForm]         = useState({ fullName: '', email: '', password: '' });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const inputCls = `w-full px-4 py-3 text-sm rounded-xl border outline-none transition-all ${
    dark
      ? 'bg-charcoal-900 border-charcoal-600 text-white placeholder-charcoal-500 focus:border-gold-500'
      : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gold-500'
  }`;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!supabaseConfigured) {
      setError('Supabase is not configured yet. Please add your credentials to .env');
      setLoading(false);
      return;
    }

    if (tab === 'signup') {
      const { error } = await signUp({ email: form.email, password: form.password, fullName: form.fullName, role });
      if (error) setError(error.message);
      else { onClose?.(); }
    } else {
      const { error } = await signIn({ email: form.email, password: form.password });
      if (error) setError(error.message);
      else { onClose?.(); }
    }
    setLoading(false);
  }

  async function handleGoogle() {
    setError('');
    if (!supabaseConfigured) { setError('Supabase not configured.'); return; }
    const { error } = await signInWithGoogle();
    if (error) setError(error.message);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className={`relative w-full max-w-md rounded-2xl border shadow-2xl ${
        dark ? 'bg-charcoal-900 border-charcoal-700' : 'bg-white border-gray-200'
      }`}>
        {/* Close */}
        <button type="button" onClick={onClose}
          className={`absolute top-4 right-4 p-1.5 rounded-lg transition-colors ${dark ? 'text-charcoal-400 hover:text-white hover:bg-charcoal-700' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'}`}>
          <X size={16} />
        </button>

        <div className="p-6">
          {/* Logo */}
          <div className="text-center mb-6">
            <span className="text-3xl">🎬</span>
            <h2 className={`font-display font-bold text-xl mt-1 ${dark ? 'text-white' : 'text-gray-900'}`}>
              Creator<span className="text-gradient-gold">Match</span>
            </h2>
          </div>

          {/* Tab switcher */}
          <div className={`flex rounded-xl border overflow-hidden mb-5 ${dark ? 'border-charcoal-700' : 'border-gray-200'}`}>
            {[['login','Sign In'],['signup','Create Account']].map(([t, label]) => (
              <button key={t} type="button" onClick={() => { setTab(t); setError(''); }}
                className={`flex-1 py-2.5 text-xs font-bold transition-colors ${
                  tab === t ? 'bg-gold-500 text-charcoal-900' : dark ? 'text-charcoal-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                }`}>{label}</button>
            ))}
          </div>

          {/* Role selector (signup only) */}
          {tab === 'signup' && (
            <div className="mb-4">
              <p className={`text-xs font-medium mb-2 ${dark ? 'text-charcoal-400' : 'text-gray-500'}`}>I am a...</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'client',  icon: Users,     label: 'Client', sub: 'Looking to hire' },
                  { id: 'creator', icon: Building2, label: 'Creator', sub: 'Offering services' },
                ].map(({ id, icon: Icon, label, sub }) => (
                  <button key={id} type="button" onClick={() => setRole(id)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                      role === id
                        ? 'border-gold-500 bg-gold-500/10'
                        : dark ? 'border-charcoal-700 hover:border-charcoal-500' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                    <Icon size={20} className={role === id ? 'text-gold-400' : dark ? 'text-charcoal-400' : 'text-gray-400'} />
                    <span className={`text-xs font-bold ${role === id ? 'text-gold-400' : dark ? 'text-white' : 'text-gray-900'}`}>{label}</span>
                    <span className={`text-[10px] ${dark ? 'text-charcoal-500' : 'text-gray-400'}`}>{sub}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {tab === 'signup' && (
              <div className="relative">
                <User size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${dark ? 'text-charcoal-400' : 'text-gray-400'}`} />
                <input type="text" placeholder="Full Name" required value={form.fullName}
                  onChange={e => set('fullName', e.target.value)}
                  className={`${inputCls} pl-10`} />
              </div>
            )}

            <div className="relative">
              <Mail size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${dark ? 'text-charcoal-400' : 'text-gray-400'}`} />
              <input type="email" placeholder="Email address" required value={form.email}
                onChange={e => set('email', e.target.value)}
                className={`${inputCls} pl-10`} />
            </div>

            <div className="relative">
              <Lock size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${dark ? 'text-charcoal-400' : 'text-gray-400'}`} />
              <input type={showPass ? 'text' : 'password'} placeholder="Password" required
                minLength={6} value={form.password}
                onChange={e => set('password', e.target.value)}
                className={`${inputCls} pl-10 pr-10`} />
              <button type="button" onClick={() => setShowPass(s => !s)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 ${dark ? 'text-charcoal-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}>
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl bg-gold-500 hover:bg-gold-600 text-charcoal-900 text-sm font-bold disabled:opacity-50 transition-all">
              {loading ? 'Please wait...' : tab === 'login' ? 'Sign In' : `Create ${role === 'creator' ? 'Creator' : 'Client'} Account`}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className={`flex-1 h-px ${dark ? 'bg-charcoal-700' : 'bg-gray-200'}`} />
            <span className={`text-[10px] ${dark ? 'text-charcoal-600' : 'text-gray-400'}`}>or</span>
            <div className={`flex-1 h-px ${dark ? 'bg-charcoal-700' : 'bg-gray-200'}`} />
          </div>

          <button type="button" onClick={handleGoogle}
            className={`w-full py-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold transition-all ${
              dark ? 'border-charcoal-600 text-charcoal-300 hover:border-charcoal-500 hover:text-white' : 'border-gray-200 text-gray-600 hover:text-gray-900'
            }`}>
            <Chrome size={14} /> Continue with Google
          </button>

          <p className={`text-center text-[10px] mt-4 ${dark ? 'text-charcoal-600' : 'text-gray-400'}`}>
            {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button type="button" onClick={() => { setTab(tab === 'login' ? 'signup' : 'login'); setError(''); }}
              className="text-gold-400 hover:text-gold-300 font-medium">
              {tab === 'login' ? 'Sign up free' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
