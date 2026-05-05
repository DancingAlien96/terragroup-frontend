'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { logout, setStoredToken } from '@/lib/auth';

export default function AdminLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Limpiar sesión previa al cargar el login de admin
  useEffect(() => {
    logout();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/auth/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        },
      );
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message ?? 'Credenciales incorrectas');
        return;
      }

      if (data.data.user.rol !== 'superadmin') {
        setError('Acceso denegado. Solo administradores del sistema.');
        return;
      }

      setStoredToken(data.data.token);
      localStorage.setItem('tg_user', JSON.stringify(data.data.user));
      document.cookie = `tg_token=${data.data.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
      window.location.href = '/admin/panel';
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#d4a843]/10 border border-[#d4a843]/20 mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-[#d4a843]">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Terra<span className="text-[#d4a843]">Group</span>
          </h1>
          <p className="text-[#6b7280] text-sm mt-1">Panel de administración del sistema</p>
        </div>

        {/* Card */}
        <div className="bg-[#1a1d27] border border-white/8 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-white font-semibold text-lg mb-1">Acceso restringido</h2>
          <p className="text-[#6b7280] text-xs mb-6">Solo para administradores autorizados del sistema.</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3 mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold text-[#9ca3af] uppercase tracking-wide block mb-2">
                Usuario
              </label>
              <input
                type="text"
                autoComplete="username"
                required
                value={form.username}
                onChange={e => setForm(s => ({ ...s, username: e.target.value }))}
                placeholder="usuario_admin"
                className="w-full bg-[#0f1117] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-[#4b5563] focus:outline-none focus:ring-2 focus:ring-[#d4a843]/50 focus:border-[#d4a843]/50 transition"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#9ca3af] uppercase tracking-wide block mb-2">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={form.password}
                  onChange={e => setForm(s => ({ ...s, password: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full bg-[#0f1117] border border-white/10 rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-[#4b5563] focus:outline-none focus:ring-2 focus:ring-[#d4a843]/50 focus:border-[#d4a843]/50 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4b5563] hover:text-[#9ca3af] transition-colors"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full bg-[#d4a843] hover:bg-[#b8922e] disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> Verificando...</>
              ) : 'Ingresar al sistema'}
            </button>
          </form>
        </div>

        <p className="text-center text-[#374151] text-xs mt-6">
          ¿Eres un usuario normal?{' '}
          <a href="/login" className="text-[#d4a843]/60 hover:text-[#d4a843] transition-colors">
            Ir al login
          </a>
        </p>
      </div>
    </div>
  );
}
