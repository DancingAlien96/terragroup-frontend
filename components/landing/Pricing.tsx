import Link from 'next/link';
import { MessageSquare, Settings, GraduationCap, Rocket, Mail, ArrowRight } from 'lucide-react';

const PASOS = [
  {
    n: '01',
    icon: MessageSquare,
    title: 'Solicita tu demo gratuita',
    desc: 'Contáctanos por correo o WhatsApp y agendamos una llamada para entender las necesidades de tu lotificación.',
  },
  {
    n: '02',
    icon: Settings,
    title: 'Configuramos tu sistema',
    desc: 'En menos de 24 horas tu instancia personalizada queda lista, con tus lotes, vendedores y datos iniciales cargados.',
  },
  {
    n: '03',
    icon: GraduationCap,
    title: 'Capacitamos a tu equipo',
    desc: 'Sesión de capacitación online incluida. Tu equipo aprende a usar todas las funciones del sistema desde el primer día.',
  },
  {
    n: '04',
    icon: Rocket,
    title: 'Listo, a operar',
    desc: 'Soporte continuo, actualizaciones y respaldos automáticos. Tú te enfocas en vender; nosotros del resto.',
  },
];

const BENEFITS = [
  'Mayor control de tu cartera',
  'Ahorro de tiempo y recursos',
  'Decisiones basadas en información real',
  'Seguridad y respaldo de tu información',
  'Soporte técnico confiable',
];

export default function Pricing() {
  return (
    <section id="precios" className="bg-[#f9fafb] py-16 sm:py-24 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="text-center mb-12 sm:mb-16">
          <span className="text-[#d4a843] text-sm font-semibold uppercase tracking-widest">Cómo empezar</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mt-2 mb-4">
            Tu sistema administrador en 4 pasos
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-base">
            Implementamos TerraGroup llave en mano. Sin contratos largos, sin sorpresas — un proceso simple para que empieces a operar rápido.
          </p>
        </div>

        {/* ── Pasos ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
          {PASOS.map((p, i) => {
            const Icon = p.icon;
            return (
              <div
                key={p.n}
                className="relative bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg hover:border-[#d4a843]/40 transition-all"
              >
                {/* Connector arrow (desktop only) */}
                {i < PASOS.length - 1 && (
                  <div className="hidden lg:flex absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-6 rounded-full bg-[#fdf3d9] items-center justify-center z-10">
                    <ArrowRight size={12} className="text-[#d4a843]" />
                  </div>
                )}

                {/* Number badge */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl font-extrabold text-[#d4a843]/30">{p.n}</span>
                  <div className="w-10 h-10 rounded-xl bg-[#fdf3d9] text-[#d4a843] flex items-center justify-center">
                    <Icon size={20} />
                  </div>
                </div>

                <h3 className="font-bold text-gray-900 text-base mb-2">{p.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{p.desc}</p>
              </div>
            );
          })}
        </div>

        {/* ── Cards de planes ────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          {/* Básico */}
          <div className="bg-white border border-gray-200 rounded-3xl p-8 flex flex-col shadow-sm">
            <span className="text-[#b8922e] text-xs font-bold uppercase tracking-widest mb-2">Plan Básico</span>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-4xl font-extrabold text-gray-900">$250</span>
              <span className="text-sm text-gray-500 font-medium">USD/mes</span>
            </div>
            <p className="text-xs text-gray-500 mb-6">14 días gratis · cancela cuando quieras</p>
            <ul className="flex flex-col gap-2.5 text-sm text-gray-700 mb-8 flex-1">
              <li className="flex items-start gap-2">
                <span className="text-[#d4a843] mt-0.5 font-bold">✓</span>
                <span><strong>1 proyecto</strong> (una lotificación)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#d4a843] mt-0.5 font-bold">✓</span>
                Todas las funciones del sistema
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#d4a843] mt-0.5 font-bold">✓</span>
                Cobranza automática por WhatsApp y correo
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#d4a843] mt-0.5 font-bold">✓</span>
                Reportes completos
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#d4a843] mt-0.5 font-bold">✓</span>
                Proyectos extra a $50/mes
              </li>
            </ul>
            <Link
              href="/register?plan=basico"
              className="flex items-center justify-center gap-2 border border-gray-300 hover:border-gray-900 text-gray-900 font-semibold px-6 py-3.5 rounded-full transition-colors text-sm"
            >
              Empezar prueba gratuita
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* Business — destacado */}
          <div className="relative bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#2a2a2a] rounded-3xl p-8 flex flex-col shadow-2xl scale-100 md:scale-105">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#d4a843] text-[#1a1a1a] text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
              Más popular
            </span>
            <span className="text-[#d4a843] text-xs font-bold uppercase tracking-widest mb-2">Plan Business</span>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-4xl font-extrabold text-white">$350</span>
              <span className="text-sm text-gray-400 font-medium">USD/mes</span>
            </div>
            <p className="text-xs text-gray-400 mb-6">14 días gratis · cancela cuando quieras</p>
            <ul className="flex flex-col gap-2.5 text-sm text-white/85 mb-8 flex-1">
              <li className="flex items-start gap-2">
                <span className="text-[#d4a843] mt-0.5 font-bold">✓</span>
                <span><strong className="text-white">2 proyectos</strong> (dos lotificaciones)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#d4a843] mt-0.5 font-bold">✓</span>
                Todas las funciones del sistema
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#d4a843] mt-0.5 font-bold">✓</span>
                Cobranza automática por WhatsApp y correo
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#d4a843] mt-0.5 font-bold">✓</span>
                Reportes completos
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#d4a843] mt-0.5 font-bold">✓</span>
                Proyectos extra a $50/mes
              </li>
            </ul>
            <Link
              href="/register?plan=business"
              className="flex items-center justify-center gap-2 bg-[#d4a843] hover:bg-[#b8922e] text-[#1a1a1a] font-bold px-6 py-3.5 rounded-full transition-colors text-sm shadow-lg shadow-[#d4a843]/20"
            >
              Empezar prueba gratuita
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* Lifetime — CTA por email */}
          <div className="bg-white border-2 border-dashed border-gray-300 rounded-3xl p-8 flex flex-col">
            <span className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2">Plan Lifetime</span>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-3xl font-extrabold text-gray-900">Consulta</span>
            </div>
            <p className="text-xs text-gray-500 mb-6">Compra el sistema de por vida, sin mensualidad</p>
            <ul className="flex flex-col gap-2.5 text-sm text-gray-700 mb-8 flex-1">
              <li className="flex items-start gap-2">
                <span className="text-[#d4a843] mt-0.5 font-bold">✓</span>
                <span><strong>Proyectos ilimitados</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#d4a843] mt-0.5 font-bold">✓</span>
                Un solo pago, acceso perpetuo
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#d4a843] mt-0.5 font-bold">✓</span>
                Todas las funciones incluidas
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#d4a843] mt-0.5 font-bold">✓</span>
                Soporte prioritario
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#d4a843] mt-0.5 font-bold">✓</span>
                Adaptado a tu operación
              </li>
            </ul>
            <a
              href="mailto:soporte@piums.io?subject=Consulta%20Plan%20Lifetime%20TerraGroup"
              className="flex items-center justify-center gap-2 border border-gray-300 hover:border-gray-900 text-gray-900 font-semibold px-6 py-3.5 rounded-full transition-colors text-sm"
            >
              <Mail size={14} />
              Contactar por email
            </a>
          </div>
        </div>


        {/* ── Benefits ───────────────────────────────────────── */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-5 gap-6">
          {BENEFITS.map((b) => (
            <div key={b} className="flex flex-col items-center gap-2 text-center">
              <div className="w-10 h-10 rounded-full bg-[#fdf3d9] text-[#d4a843] flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide leading-tight">{b}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
