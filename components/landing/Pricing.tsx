import Link from 'next/link';

const PLANS = [
  {
    name: 'Básico',
    price: '$45',
    period: '/ mensual',
    description: 'Para empresas que están comenzando su digitalización.',
    maxLotes: 'Hasta 150 lotes',
    maxUsers: '1 usuario administrativo',
    features: [
      'Registro de clientes y lotes',
      'Control de pagos (manual asistido)',
      'Historial de pagos por cliente',
      'Estado de cuenta básico',
      'Reporte mensual de ingresos',
      'Dashboard básico',
      'Recordatorios manuales',
      'Envío de recibo interno',
    ],
    highlight: false,
    cta: 'Comenzar gratis',
  },
  {
    name: 'Profesional',
    price: '$90',
    period: '/ mensual',
    description: 'El plan más popular para empresas en crecimiento.',
    maxLotes: '151 hasta 300 lotes',
    maxUsers: '3 usuarios administrativos',
    features: [
      'Todo lo del plan Básico',
      'Control de mora automatizado',
      'Clasificación de cartera',
      'Reportes mensuales y trimestrales',
      'Estados de cuenta automatizados',
      'Dashboard avanzado',
      'Exportación de reportes (PDF)',
      'Notificaciones automáticas (WhatsApp y Email)',
    ],
    highlight: true,
    cta: 'Empezar ahora',
  },
  {
    name: 'Empresarial',
    price: '$150',
    period: '/ mensual',
    description: 'Para grandes empresas con operaciones complejas.',
    maxLotes: '301 hasta 1,000 lotes',
    maxUsers: '5 usuarios administrativos',
    features: [
      'Todo lo del plan Profesional',
      'Expediente digital del cliente',
      'Control de usuarios y roles',
      'Supervisión operativa del equipo',
      'Reportes administrativos completos',
      'Notificaciones WhatsApp opcional',
      'Soporte prioritario',
      'Configuración personalizada',
    ],
    highlight: false,
    cta: 'Contactar ventas',
  },
];

export default function Pricing() {
  return (
    <section id="precios" className="bg-[#f9fafb] py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-[#d4a843] text-sm font-semibold uppercase tracking-widest">Precios</span>
          <h2 className="text-4xl font-extrabold text-gray-900 mt-2 mb-4">
            Planes para cada tamaño de empresa
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-base">
            Sin costos ocultos. Elige el plan que se adapta a tu cartera de lotes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl p-8 flex flex-col gap-5 border transition-shadow hover:shadow-lg ${
                plan.highlight
                  ? 'bg-[#1a1a1a] border-[#d4a843]/60 text-white shadow-xl scale-105'
                  : 'bg-white border-gray-200 text-gray-900'
              }`}
            >
              <div>
                <h3 className={`text-xs font-bold uppercase tracking-widest mb-1 ${plan.highlight ? 'text-[#d4a843]' : 'text-[#d4a843]'}`}>
                  {plan.name}
                </h3>
                <div className="flex items-end gap-1">
                  <span className="text-5xl font-extrabold">{plan.price}</span>
                  <span className={`text-sm mb-2 ${plan.highlight ? 'text-[#d4a843]/70' : 'text-gray-400'}`}>{plan.period}</span>
                </div>
                <p className={`text-sm mt-2 ${plan.highlight ? 'text-white/70' : 'text-gray-500'}`}>{plan.description}</p>
              </div>

              <div className={`text-xs font-semibold rounded-lg px-3 py-2 ${plan.highlight ? 'bg-[#d4a843]/15 text-[#d4a843]' : 'bg-[#fdf3d9] text-[#92700a]'}`}>
                {plan.maxLotes} · {plan.maxUsers}
              </div>

              <ul className="flex flex-col gap-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <svg className={`mt-0.5 shrink-0 ${plan.highlight ? 'text-[#d4a843]' : 'text-[#d4a843]'}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className={plan.highlight ? 'text-white/85' : 'text-gray-600'}>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/login"
                className={`mt-auto text-center font-semibold text-sm px-6 py-3 rounded-full transition-colors ${
                  plan.highlight
                    ? 'bg-[#d4a843] text-[#1a1a1a] hover:bg-[#b8922e]'
                    : 'bg-[#1a1a1a] text-white hover:bg-[#333]'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Benefits */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-5 gap-6">
          {[
            'Mayor control de tu cartera',
            'Ahorro de tiempo y recursos',
            'Decisiones basadas en información real',
            'Seguridad y respaldo de tu información',
            'Soporte técnico confiable',
          ].map((b) => (
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
