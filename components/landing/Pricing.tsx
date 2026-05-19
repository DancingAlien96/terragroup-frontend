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

        {/* ── Precio + CTA ───────────────────────────────────── */}
        <div className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#2a2a2a] rounded-3xl overflow-hidden shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
            {/* Precio */}
            <div className="lg:col-span-2 p-8 sm:p-10 lg:border-r lg:border-white/10 flex flex-col justify-center">
              <span className="text-[#d4a843] text-xs font-bold uppercase tracking-widest mb-3">Inversión única</span>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-5xl sm:text-6xl font-extrabold text-white">$2,000</span>
                <span className="text-lg text-gray-400 font-medium">USD</span>
              </div>
              <p className="text-sm text-gray-400 mb-4">≈ Q15,400 GTQ al tipo de cambio actual</p>
              <div className="h-px bg-white/10 my-4" />
              <ul className="flex flex-col gap-2 text-sm text-white/80">
                <li className="flex items-start gap-2">
                  <span className="text-[#d4a843] mt-0.5">✓</span>
                  Configuración llave en mano
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#d4a843] mt-0.5">✓</span>
                  Capacitación incluida
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#d4a843] mt-0.5">✓</span>
                  Soporte continuo y actualizaciones
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#d4a843] mt-0.5">✓</span>
                  Sin contratos atados
                </li>
              </ul>
            </div>

            {/* CTAs */}
            <div className="lg:col-span-3 p-8 sm:p-10 flex flex-col justify-center gap-5">
              <div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-3 leading-tight">
                  ¿Listo para digitalizar tu lotificación?
                </h3>
                <p className="text-white/70 text-base leading-relaxed">
                  Agenda una demo gratuita y descubre cómo TerraGroup puede transformar la gestión de cobranza de tu empresa.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-2">
                <a
                  href="mailto:terragroup692@gmail.com?subject=Solicitud%20de%20demo%20TerraGroup"
                  className="flex items-center justify-center gap-2 bg-[#d4a843] hover:bg-[#b8922e] text-[#1a1a1a] font-bold px-6 py-4 rounded-full transition-colors text-sm shadow-lg shadow-[#d4a843]/20"
                >
                  <Mail size={16} />
                  Solicitar demo gratuita
                </a>
                <Link
                  href="/register"
                  className="flex items-center justify-center gap-2 border border-white/30 hover:border-white text-white font-semibold px-6 py-4 rounded-full transition-colors text-sm"
                >
                  Crear cuenta ahora
                  <ArrowRight size={16} />
                </Link>
              </div>

              <p className="text-xs text-white/50 mt-1">
                ¿Dudas? Escríbenos a{' '}
                <a href="mailto:terragroup692@gmail.com" className="text-[#d4a843] hover:underline">
                  terragroup692@gmail.com
                </a>
              </p>
            </div>
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
