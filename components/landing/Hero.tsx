import Link from 'next/link';

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-start overflow-hidden">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/fondohero.png')",
        }}
      />
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/55 to-black/20" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-24 w-full">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white text-xs font-semibold px-4 py-2 rounded-full mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#d4a843] animate-pulse" />
          El SaaS #1 para lotificaciones en Latinoamérica
        </div>

        {/* Heading */}
        <h1 className="text-5xl md:text-6xl font-extrabold text-white leading-tight max-w-2xl mb-4">
          Gestiona tu lotificación{' '}
          <span className="text-[#f5c842]">sin complicaciones</span>
        </h1>

        {/* Subtitle */}
        <p className="text-white/75 text-lg max-w-lg leading-relaxed mb-10">
          Controla pagos, automatiza cobranzas, genera reportes financieros y
          mantén a tus propietarios informados. Todo en una sola plataforma
          diseñada para desarrolladores de lotificaciones.
        </p>

        {/* Buttons */}
        <div className="flex flex-wrap gap-4 mb-14">
          <Link
            href="#precios"
            className="flex items-center gap-2 bg-[#d4a843] hover:bg-[#b8922e] text-white font-semibold px-7 py-4 rounded-full transition-colors text-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Solicitar demo gratuita
          </Link>
          <a
            href="#funciones"
            className="flex items-center gap-2 border border-white/40 hover:border-white text-white font-semibold px-7 py-4 rounded-full transition-colors text-sm backdrop-blur-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
            </svg>
            Ver funciones
          </a>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap gap-6 text-white/70 text-xs font-medium">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Seguridad bancaria
          </div>
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            Configuración en 24h
          </div>
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 01.21 2.18 2 2 0 012.22 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.1 6.1l1.08-1.08a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
            </svg>
            Soporte prioritario
          </div>
        </div>
      </div>
    </section>
  );
}
