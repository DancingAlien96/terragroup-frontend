'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Check } from 'lucide-react';
import { api } from '@/lib/api';
import LegalModal, { type LegalTipo } from '@/components/legal/LegalModal';

const STEPS = ['Empresa', 'Plan', 'Administrador'];

type PlanSlug = 'basico' | 'business';

interface PlanOption {
  slug:      PlanSlug;
  nombre:    string;
  precio:    number;
  proyectos: number;
  features:  string[];
  destacado?: boolean;
}

const PLANES: PlanOption[] = [
  {
    slug:      'basico',
    nombre:    'Básico',
    precio:    250,
    proyectos: 1,
    features:  [
      '1 proyecto',
      'Todas las funciones del sistema',
      'Cobranza automática por WhatsApp y correo',
      'Reportes completos',
      'Puedes agregar proyectos extra por $50/mes',
    ],
  },
  {
    slug:      'business',
    nombre:    'Business',
    precio:    350,
    proyectos: 2,
    features:  [
      '2 proyectos',
      'Todas las funciones del sistema',
      'Cobranza automática por WhatsApp y correo',
      'Reportes completos',
      'Puedes agregar proyectos extra por $50/mes',
    ],
    destacado: true,
  },
];

export default function RegisterPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [empresa, setEmpresa] = useState({ nombre: '', email: '', telefono: '' });
  const [planElegido, setPlanElegido] = useState<PlanSlug>('basico');
  const [admin, setAdmin] = useState({ nombre: '', email: '', username: '', password: '', confirmPassword: '' });
  const [aceptoTerminos, setAceptoTerminos] = useState(false);
  const [legalAbierto, setLegalAbierto] = useState<LegalTipo | null>(null);

  const planActual = PLANES.find((p) => p.slug === planElegido)!;
  const canNextStep0 = empresa.nombre.trim().length >= 2;
  const canSubmit = admin.nombre && admin.email && admin.username &&
    admin.password.length >= 6 && admin.password === admin.confirmPassword &&
    aceptoTerminos;

  async function handleSubmit() {
    setLoading(true);
    setError('');
    try {
      const result = await api.empresas.register({
        empresa_nombre:   empresa.nombre,
        empresa_email:    empresa.email || undefined,
        empresa_telefono: empresa.telefono || undefined,
        plan:             planElegido,
        nombre_admin:     admin.nombre,
        email_admin:      admin.email,
        username_admin:   admin.username,
        password_admin:   admin.password,
        acepto_terminos:  aceptoTerminos,
      });
      if (result?.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }
      setError('No se pudo iniciar el pago. Inténtalo de nuevo.');
    } catch (e: unknown) {
      setError((e as Error).message ?? 'Error al registrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f9fafb] flex flex-col items-center justify-center p-4 py-8">
      {/* Logo */}
      <div className="mb-6 text-center">
        <span className="text-2xl font-bold text-[#1a1a1a] tracking-tight">
          Terra<span className="text-[#d4a843]">Group</span>
        </span>
        <p className="text-sm text-gray-500 mt-1">14 días gratis · Cancela sin costo antes del cobro</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-6 flex-wrap justify-center">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors shrink-0 ${
              i < step ? 'bg-[#d4a843] text-white' :
              i === step ? 'bg-[#1a1a1a] text-white' :
              'bg-gray-200 text-gray-400'
            }`}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className={`text-sm font-medium hidden sm:inline ${i === step ? 'text-[#1a1a1a]' : 'text-gray-400'}`}>{label}</span>
            {i < STEPS.length - 1 && <div className={`w-6 sm:w-10 h-0.5 mx-1 ${i < step ? 'bg-[#d4a843]' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm w-full ${step === 1 ? 'max-w-3xl' : 'max-w-lg'} p-6 sm:p-8`}>

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

        {/* Step 1: Selector de plan */}
        {step === 1 && (
          <div className="flex flex-col gap-5">
            <div className="text-center">
              <h2 className="text-lg font-bold text-[#1a1a1a]">Elige tu plan</h2>
              <p className="text-sm text-gray-500 mt-1">Empezás con 14 días gratis en cualquiera. Cancelás antes del cobro y no se te cobra nada.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PLANES.map((plan) => {
                const seleccionado = planElegido === plan.slug;
                return (
                  <button
                    key={plan.slug}
                    type="button"
                    onClick={() => setPlanElegido(plan.slug)}
                    className={`relative text-left rounded-2xl border-2 p-5 transition-all ${
                      seleccionado
                        ? 'border-[#d4a843] bg-[#fdf3d9]/30 shadow-md'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {plan.destacado && (
                      <span className="absolute -top-2.5 right-4 bg-[#d4a843] text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
                        Recomendado
                      </span>
                    )}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-xs font-semibold text-[#b8922e] uppercase tracking-wide">Plan</p>
                        <h3 className="text-2xl font-extrabold text-[#1a1a1a] mt-0.5">{plan.nombre}</h3>
                      </div>
                      {seleccionado && (
                        <div className="w-6 h-6 rounded-full bg-[#d4a843] flex items-center justify-center shrink-0">
                          <Check size={14} strokeWidth={3} className="text-white" />
                        </div>
                      )}
                    </div>
                    <div className="mb-4">
                      <span className="text-3xl font-extrabold text-[#1a1a1a]">${plan.precio}</span>
                      <span className="text-sm text-gray-500 ml-1">USD/mes</span>
                    </div>
                    <ul className="flex flex-col gap-2">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-xs text-gray-700">
                          <Check size={12} className="text-[#d4a843] mt-0.5 shrink-0" strokeWidth={3} />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-xs text-blue-800">
              💡 En el siguiente paso vas a registrar tu tarjeta. <strong>No se cobra nada hoy</strong>. Al día 15 se hace el primer cobro de {planActual.nombre}. Puedes cancelar antes desde tu panel sin costo.
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(0)}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                ← Atrás
              </button>
              <button onClick={() => setStep(2)}
                className="flex-1 bg-[#d4a843] hover:bg-[#b8922e] text-white font-semibold py-2.5 rounded-lg transition-colors text-sm">
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

            {/* Resumen del pago con plan elegido */}
            <div className="bg-[#fdf3d9]/40 border border-[#d4a843]/30 rounded-lg p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Plan elegido:</span>
                <span className="font-bold text-[#1a1a1a]">{planActual.nombre}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-gray-700">Trial:</span>
                <span className="font-bold text-[#1a1a1a]">14 días gratis</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-gray-700">Luego se cobra:</span>
                <span className="font-bold text-[#1a1a1a]">${planActual.precio} USD/mes</span>
              </div>
              <button type="button" onClick={() => setStep(1)}
                className="text-xs text-[#b8922e] font-semibold hover:underline mt-2">
                Cambiar plan
              </button>
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
                <div className="relative">
                  <input type={type === 'password' ? (showPassword ? 'text' : 'password') : type}
                    placeholder={placeholder}
                    value={admin[key as keyof typeof admin]}
                    onChange={e => setAdmin(s => ({ ...s, [key]: e.target.value }))}
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843] ${
                      key === 'confirmPassword' && admin.confirmPassword && admin.password !== admin.confirmPassword
                        ? 'border-red-400 pr-10' : 'border-gray-200' + (type === 'password' ? ' pr-10' : '')
                    }`} />
                  {type === 'password' && (
                    <button type="button" onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      tabIndex={-1}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  )}
                </div>
                {key === 'confirmPassword' && admin.confirmPassword && admin.password !== admin.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden</p>
                )}
              </div>
            ))}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-2.5">{error}</div>
            )}

            <div className="flex items-start gap-2.5 mt-1">
              <input
                id="acepto-terminos"
                type="checkbox"
                checked={aceptoTerminos}
                onChange={(e) => setAceptoTerminos(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#d4a843] focus:ring-2 focus:ring-[#d4a843]/50 cursor-pointer shrink-0"
              />
              <label htmlFor="acepto-terminos" className="text-xs text-gray-600 leading-relaxed select-none cursor-pointer">
                He leído y acepto los{' '}
                <button type="button" onClick={() => setLegalAbierto('terminos')}
                  className="text-[#d4a843] font-semibold hover:underline">
                  Términos y Condiciones
                </button>
                , la{' '}
                <button type="button" onClick={() => setLegalAbierto('privacidad')}
                  className="text-[#d4a843] font-semibold hover:underline">
                  Política de Privacidad
                </button>
                {' '}y el{' '}
                <button type="button" onClick={() => setLegalAbierto('aviso-ia')}
                  className="text-[#d4a843] font-semibold hover:underline">
                  Aviso sobre uso de IA
                </button>
                {' '}de TerraGroup.
              </label>
            </div>

            <div className="flex gap-3 mt-1">
              <button onClick={() => setStep(1)}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                ← Atrás
              </button>
              <button disabled={!canSubmit || loading} onClick={handleSubmit}
                className="flex-1 flex items-center justify-center gap-2 bg-[#d4a843] hover:bg-[#b8922e] disabled:opacity-40 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm">
                {loading ? (
                  <><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> Redirigiendo al pago...</>
                ) : 'Continuar al pago →'}
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="mt-6 text-sm text-gray-500">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="text-[#d4a843] font-semibold hover:underline">Inicia sesión</Link>
      </p>

      <LegalModal tipo={legalAbierto} onClose={() => setLegalAbierto(null)} />
    </div>
  );
}
