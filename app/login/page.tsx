'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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
        setError(data.message ?? 'Usuario o contraseña incorrectos');
        return;
      }

      localStorage.setItem('tg_token', data.data.token);
      localStorage.setItem('tg_user', JSON.stringify(data.data.user));
      // Set cookie for middleware route protection
      document.cookie = `tg_token=${data.data.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
      router.push('/dashboard');
    } catch {
      setError('No se pudo conectar con el servidor. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gray-900 items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/fondohero.png')" }}
        />
        <div className="absolute inset-0 bg-black/65" />
        <div className="relative z-10 max-w-sm text-center px-8">
          <Image src="/logo.png" alt="TerraGroup" width={120} height={120} className="mx-auto mb-6" />
          <h2 className="text-white text-3xl font-extrabold mb-3">
            <span className="text-white">Terra</span><span className="text-[#d4a843]">Group</span>
          </h2>
          <p className="text-white/70 text-sm leading-relaxed">
            Conectamos tu proyecto con eficiencia. Gestiona tu lotificación desde un solo lugar.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <Image src="/logo.png" alt="TerraGroup" width={48} height={48} />
            <span className="font-bold text-xl text-gray-900">
              <span>Terra</span><span className="text-[#d4a843]">Group</span>
            </span>
          </div>

          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Bienvenido</h1>
          <p className="text-gray-500 text-sm mb-8">
            Ingresa tus credenciales para acceder al sistema.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Usuario
              </label>
              <input
                type="text"
                autoComplete="username"
                required
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="tu_usuario"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#d4a843] focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="********"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#d4a843] focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-[#d4a843] hover:bg-[#b8922e] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm px-6 py-3.5 rounded-xl transition-colors mt-2"
            >
              {loading ? 'Iniciando sesión...' : 'Ingresar al sistema'}
            </button>
          </form>

          <p className="text-center text-gray-400 text-xs mt-8">
            ¿No tienes cuenta?{' '}
            <a href="mailto:soporte@terragroup.mx" className="text-[#d4a843] hover:underline">
              Contacta a soporte
            </a>
          </p>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <Link href="/" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              ← Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
