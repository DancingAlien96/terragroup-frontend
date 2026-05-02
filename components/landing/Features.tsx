const FEATURES = [
  {
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
    title: 'Dashboard en tiempo real',
    desc: 'Visualiza el estado de tu cartera, cobros del mes y propietarios en mora desde un panel centralizado.',
  },
  {
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
      </svg>
    ),
    title: 'Control de pagos',
    desc: 'Registra cobros manualmente, genera recibos automáticos y lleva el historial completo por propietario.',
  },
  {
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M18 20V10M12 20V4M6 20v-6" />
      </svg>
    ),
    title: 'Reportes avanzados',
    desc: 'Exporta reportes mensuales y trimestrales en PDF con desglose por lote, propietario y estado de cuenta.',
  },
  {
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
      </svg>
    ),
    title: 'Alertas automáticas',
    desc: 'Envía recordatorios de pago por WhatsApp y Email antes de que los clientes entren en mora.',
  },
  {
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    title: 'Gestión de vendedores',
    desc: 'Asigna vendedores a clientes y lotes, calcula comisiones automáticamente por cada cobro realizado.',
  },
  {
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    title: 'Seguridad y multi-empresa',
    desc: 'Cada empresa tiene su propio entorno aislado. Controla roles y permisos según el plan contratado.',
  },
];

export default function Features() {
  return (
    <section id="funciones" className="bg-white py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-[#d4a843] text-sm font-semibold uppercase tracking-widest">Funcionalidades</span>
          <h2 className="text-4xl font-extrabold text-gray-900 mt-2 mb-4">
            Todo lo que necesitas para gestionar tu cartera
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-base">
            Herramientas diseñadas específicamente para empresas de lotificación en Latinoamérica.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {FEATURES.map((f) => (
            <div key={f.title} className="border border-gray-100 rounded-2xl p-7 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-[#fdf3d9] text-[#d4a843] flex items-center justify-center mb-5">
                {f.icon}
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
