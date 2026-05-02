'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { setStoredToken } from '@/lib/auth';

interface Plan {
  id: number;
  nombre: string;
  precio: number;
  max_lotes: number;
  max_usuarios: number;
}

const PLAN_FEATURES: Record<string, string[]> = {
  basico:       ['Hasta 150 lotes', '1 usuario', 'CRUD completo', 'Reportes básicos'],
  profesional:  ['Hasta 300 lotes', '3 usuarios', 'Todo lo básico', 'Cartera vencida', 'Comisiones'],
  empresarial:  ['Hasta 1,000 lotes', '5 usuarios', 'Todo lo profesional', 'Soporte prioritario'],
};

const PLAN_COLORS: Record<string, string> = {
  basico:      'border-gray-200',
  profesional: 'border-[#d4a843]',
  empresarial: 'border-gray-700',
};

const STEPS = ['Empresa', 'Plan', 'Administrador'];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [empresa, setEmpresa] = useState({ nombre: '', email: '', telefono: '' });
  const [admin, setAdmin] = useState({ nombre: '', email: '', username: '', password: '', confirmPassword: '' });

  useEffect(() => {
    api.planes.list().then(setPlanes).catch(() => {});
  }, []);

  const canNextStep0 = empresa.nombre.trim().length >= 2;
  const canNextStep1 = selectedPlan !== null;
  const canSubmit = admin.nombre && admin.email && admin.username &&
    admin.password.length >= 6 && admin.password === admin.confirmPassword;

  async function handleSubmit() {
    setLoading(true);
    setError('');
    try {
      const result = await api.empresas.register({
        empresa_nombre:   empresa.nombre,
        empresa_email:    empresa.email || undefined,
        empresa_telefono: empresa.telefono || undefined,
        plan_id:          selectedPlan!.id,
        nombre_admin:     admin.nombre,
        email_admin:      admin.email,
        username_admin:   admin.username,
        password_admin:   admin.password,
      });
      setStoredToken(result.token);
      router.push('/dashboard');
    } catch (e: unknown) {
      setError((e as Error).message ?? 'Error al registrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f9fafb] flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8 text-center">
        <span className="text-2xl font-bold text-[#1a1a1a] tracking-tight">
          Terra<span className="text-[#d4a843]">Group</span>
        </span>
        <p className="text-sm text-gray-500 mt-1">Crea tu cuenta — es gratis por 30 días</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              i < step ? 'bg-[#d4a843] text-white' :
              i === step ? 'bg-[#1a1a1a] text-white' :
              'bg-gray-200 text-gray-400'
            }`}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className={`text-sm font-medium ${i === step ? 'text-[#1a1a1a]' : 'text-gray-400'}`}>{label}</span>
            {i < STEPS.length - 1 && <div className={`w-10 h-0.5 mx-1 ${i < step ? 'bg-[#d4a843]' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm w-full max-w-lg p-8">

        {/* Step 0: Empresa */}
        {step === 0 && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-lg font-bold text-[#1a1a1a]">Datos de tu empresa</h2>
              <p className="text-sm text-gray-500 mt-0.5">Así aparecerá en el sistema</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                Nombre de la empresa <span className="text-red-500">*</span>
              </label>
              <input type="text" placeholder="Ej. Inmobiliaria del Norte S.A."
                value={empresa.nombre} onChange={e => setEmpresa(s => ({ ...s, nombre: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Email de contacto</label>
              <input type="email" placeholder="contacto@empresa.com"
                value={empresa.email} onChange={e => setEmpresa(s => ({ ...s, email: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Teléfono</label>
              <input type="tel" placeholder="+502 0000-0000"
                value={empresa.telefono} onChange={e => setEmpresa(s => ({ ...s, telefono: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
            </div>
            <button disabled={!canNextStep0} onClick={() => setStep(1)}
              className="mt-2 bg-[#d4a843] hover:bg-[#b8922e] disabled:opacity-40 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm">
              Continuar →
            </button>
          </div>
        )}

        {/* Step 1: Plan */}
        {step === 1 && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-lg font-bold text-[#1a1a1a]">Elige tu plan</h2>
              <p className="text-sm text-gray-500 mt-0.5">Primeros 30 días gratis en cualquier plan</p>
            </div>
            <div className="flex flex-col gap-3">
              {planes.map(plan => {
                const selected = selectedPlan?.id === plan.id;
                return (
                  <button key={plan.id} onClick={() => setSelectedPlan(plan)}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${selected ? 'border-[#d4a843] bg-[#fdf3d9]/40' : PLAN_COLORS[plan.nombre] ?? 'border-gray-200'} hover:border-[#d4a843]`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {selected && <span className="w-4 h-4 rounded-full bg-[#d4a843] flex items-center justify-center text-white text-xs">✓</span>}
                        <span className="font-bold text-[#1a1a1a] capitalize">{plan.nombre}</span>
                        {plan.nombre === 'profesional' && (
                          <span className="bg-[#d4a843] text-white text-xs font-bold px-2 py-0.5 rounded-full">Popular</span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-bold text-[#1a1a1a]">${plan.precio}</span>
                        <span className="text-xs text-gray-400">/mes</span>
                      </div>
                    </div>
                    <ul className="text-xs text-gray-600 flex flex-col gap-1">
                      {(PLAN_FEATURES[plan.nombre] ?? []).map(f => (
                        <li key={f} className="flex items-center gap-1.5">
                          <span className="text-green-500">✓</span> {f}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(0)}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                ← Atrás
              </button>
              <button disabled={!canNextStep1} onClick={() => setStep(2)}
                className="flex-1 bg-[#d4a843] hover:bg-[#b8922e] disabled:opacity-40 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm">
                Continuar →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Admin user */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-bold text-[#1a1a1a]">Crea tu cuenta de administrador</h2>
              <p className="text-sm text-gray-500 mt-0.5">Será el usuario principal de tu empresa</p>
            </div>
            {[
              { key: 'nombre',          label: 'Nombre completo', placeholder: 'Tu nombre', type: 'text' },
              { key: 'email',           label: 'Email',           placeholder: 'tu@empresa.com', type: 'email' },
              { key: 'username',        label: 'Usuario',         placeholder: 'sin espacios, sin acentos', type: 'text' },
              { key: 'password',        label: 'Contraseña',      placeholder: 'Mínimo 6 caracteres', type: 'password' },
              { key: 'confirmPassword', label: 'Confirmar contraseña', placeholder: 'Repite la contraseña', type: 'password' },
            ].map(({ key, label, placeholder, type }) => (
              <div key={key}>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                  {label} <span className="text-red-500">*</span>
                </label>
                <input type={type} placeholder={placeholder}
                  value={admin[key as keyof typeof admin]}
                  onChange={e => setAdmin(s => ({ ...s, [key]: e.target.value }))}
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843] ${
                    key === 'confirmPassword' && admin.confirmPassword && admin.password !== admin.confirmPassword
                      ? 'border-red-400' : 'border-gray-200'
                  }`} />
                {key === 'confirmPassword' && admin.confirmPassword && admin.password !== admin.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden</p>
                )}
              </div>
            ))}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-2.5">{error}</div>
            )}

            <div className="flex gap-3 mt-1">
              <button onClick={() => setStep(1)}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                ← Atrás
              </button>
              <button disabled={!canSubmit || loading} onClick={handleSubmit}
                className="flex-1 flex items-center justify-center gap-2 bg-[#d4a843] hover:bg-[#b8922e] disabled:opacity-40 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm">
                {loading ? (
                  <><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> Creando cuenta...</>
                ) : 'Crear cuenta'}
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="mt-6 text-sm text-gray-500">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="text-[#d4a843] font-semibold hover:underline">Inicia sesión</Link>
      </p>
    </div>
  );
}
